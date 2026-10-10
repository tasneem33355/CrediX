from __future__ import annotations

import importlib.util
from types import SimpleNamespace

import pytest

from src.ai_assistant.models import HybridRetrievalResult, RetrievalCandidate
from src.ai_assistant.retrieval.fused_retriever import FusedRetriever, load_frozen_config
from src.ai_assistant.retrieval.rrf import RRFConfig, fuse_ranked_candidates


def candidate(chunk_id: str, score: float, *, metadata: dict | None = None) -> RetrievalCandidate:
    return RetrievalCandidate(
        chunk_id=chunk_id,
        document_id="DOC1",
        document_title="Document 1",
        text_original=f"text for {chunk_id}",
        parent_id="PARENT1",
        pdf_page_start=1,
        pdf_page_end=2,
        article_number="1",
        provision_number="a",
        score=score,
        retriever="dense",
        metadata=metadata or {"parent_id": "PARENT1", "source": "fixture"},
    )


def test_standard_and_weighted_rrf_formula_use_one_based_ranks() -> None:
    dense = [candidate("shared", 0.8)]
    bm25 = [candidate("other", 4.0), candidate("shared", 3.0)]
    standard = fuse_ranked_candidates(dense, bm25, RRFConfig(rrf_k=10, fusion_top_k=10))
    shared = next(item for item in standard if item.chunk_id == "shared")
    assert shared.rrf_score == pytest.approx(1 / 11 + 1 / 12)
    weighted = fuse_ranked_candidates(dense, bm25, RRFConfig(rrf_k=10, fusion_top_k=10, dense_weight=2.0, bm25_weight=0.5))
    assert next(item for item in weighted if item.chunk_id == "shared").rrf_score == pytest.approx(2 / 11 + 0.5 / 12)


def test_dense_only_bm25_only_and_overlap_are_deduplicated_with_diagnostics() -> None:
    dense = [candidate("dense-only", 0.9), candidate("shared", 0.8, metadata={"parent_id": "PARENT1", "origin": "dense"})]
    bm25 = [candidate("bm25-only", 8.0), candidate("shared", 7.0, metadata={"parent_id": "PARENT1", "origin": "bm25"})]
    fused = {item.chunk_id: item for item in fuse_ranked_candidates(dense, bm25, RRFConfig(rrf_k=10, fusion_top_k=10))}
    assert set(fused) == {"dense-only", "bm25-only", "shared"}
    assert fused["dense-only"].retrieved_by == ["dense"]
    assert fused["dense-only"].dense_rank == 1 and fused["dense-only"].bm25_rank is None
    assert fused["bm25-only"].retrieved_by == ["bm25"]
    assert fused["bm25-only"].dense_score is None and fused["bm25-only"].bm25_score == 8.0
    assert fused["shared"].retrieved_by == ["dense", "bm25"]
    assert fused["shared"].dense_rank == 2 and fused["shared"].bm25_rank == 2
    assert fused["shared"].dense_score == 0.8 and fused["shared"].bm25_score == 7.0
    assert fused["shared"].metadata == {"parent_id": "PARENT1", "origin": "dense"}


def test_sorting_ties_are_deterministic_and_top_k_is_respected() -> None:
    dense = [candidate("dense-first", 1.0), candidate("z", 0.5)]
    bm25 = [candidate("bm25-first", 3.0), candidate("a", 2.0)]
    config = RRFConfig(rrf_k=10, fusion_top_k=2)
    first = fuse_ranked_candidates(dense, bm25, config)
    second = fuse_ranked_candidates(dense, bm25, config)
    assert [item.chunk_id for item in first] == ["dense-first", "bm25-first"]
    assert [item.chunk_id for item in first] == [item.chunk_id for item in second]


@pytest.mark.parametrize("kwargs", [
    {"rrf_k": 0}, {"rrf_k": -1}, {"dense_weight": 0}, {"bm25_weight": -0.1},
    {"dense_candidate_k": 0}, {"fusion_top_k": 0},
])
def test_invalid_rrf_configuration_is_rejected(kwargs: dict) -> None:
    with pytest.raises(ValueError):
        RRFConfig(**kwargs)


def test_fused_retriever_preserves_original_query_and_forwards_requested_pool_sizes() -> None:
    class FakeHybrid:
        def retrieve(self, query: str, dense_top_k: int, bm25_top_k: int) -> HybridRetrievalResult:
            self.call = (query, dense_top_k, bm25_top_k)
            return HybridRetrievalResult(query, [candidate("dense", 0.5)], [candidate("bm25", 1.0)])

    fake = FakeHybrid()
    query = "query kept exactly"
    result = FusedRetriever(RRFConfig(), retriever=fake).retrieve(query, dense_candidate_k=3, bm25_candidate_k=4, fusion_top_k=2)
    assert fake.call == (query, 3, 4)
    assert result.original_query == query
    assert len(result.fused_results) == 2
    assert result.configuration["fusion_top_k"] == 2


def test_default_fused_retriever_configuration_is_the_frozen_dev_selection() -> None:
    config = load_frozen_config()
    assert config.dense_candidate_k == 10
    assert config.bm25_candidate_k == 10
    assert config.fusion_top_k == 30
    assert config.rrf_k == 20
    assert config.dense_weight == 1.0
    assert config.bm25_weight == 0.75


requires_rag_runtime = pytest.mark.skipif(
    not all(importlib.util.find_spec(module) is not None for module in ("numpy", "faiss", "sentence_transformers")),
    reason="RAG integration dependencies are not installed",
)


@requires_rag_runtime
def test_fused_retriever_works_against_the_real_bundle() -> None:
    result = FusedRetriever(RRFConfig(dense_candidate_k=2, bm25_candidate_k=2, fusion_top_k=3)).retrieve("شروط منح التسهيلات الائتمانية")
    assert result.original_query == "شروط منح التسهيلات الائتمانية"
    assert 1 <= len(result.fused_results) <= 3
    assert len({item.chunk_id for item in result.fused_results}) == len(result.fused_results)
