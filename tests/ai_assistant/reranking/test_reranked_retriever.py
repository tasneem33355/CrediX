from __future__ import annotations

import importlib.util
from types import SimpleNamespace

import pytest

from src.ai_assistant.models import HybridRetrievalResult, RetrievalCandidate
from src.ai_assistant.reranking.config import RerankerConfig
from src.ai_assistant.reranking.reranked_retriever import (
    RerankedRetriever,
    build_candidate_strategy,
    needs_adaptive_candidate_pool,
    rerank_candidates,
)
import src.ai_assistant.reranking.reranked_retriever as reranked_module


def candidate(chunk_id: str, score: float) -> RetrievalCandidate:
    return RetrievalCandidate(chunk_id, "DOC", "Document", f"text-{chunk_id}", "PARENT", 1, 1, "1", "a", score,
                              "dense", {"parent_id": "PARENT", "chunk_metadata": chunk_id})


class FakeHybrid:
    def __init__(self) -> None:
        self.dense = [candidate("shared", 0.8), candidate("dense", 0.7)]
        self.bm25 = [candidate("shared", 4.0), candidate("bm25", 3.0)]

    def retrieve(self, query, dense_top_k, bm25_top_k):
        self.call = (query, dense_top_k, bm25_top_k)
        return HybridRetrievalResult(query, self.dense[:dense_top_k], self.bm25[:bm25_top_k])


class FakeReranker:
    def __init__(self, scores):
        self.scores = scores
        self.calls = []

    def score(self, query, passages):
        self.calls.append((query, list(passages)))
        return self.scores[:len(passages)]


def test_union_candidate_strategy_deduplicates_once_and_preserves_provenance() -> None:
    config = RerankerConfig(candidate_strategy="union_d20_b20", dense_candidate_k=2, bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=10)
    candidates = build_candidate_strategy(FakeHybrid().dense, FakeHybrid().bm25, config)
    assert [item.chunk_id for item in candidates] == ["shared", "dense", "bm25"]
    shared = candidates[0]
    assert shared.retrieved_by == ["dense", "bm25"]
    assert shared.dense_rank == 1 and shared.bm25_rank == 1
    assert shared.dense_score == 0.8 and shared.bm25_score == 4.0
    assert shared.metadata["chunk_metadata"] == "shared"


def test_reranked_retriever_preserves_query_scores_metadata_and_output_limit() -> None:
    hybrid = FakeHybrid()
    scorer = FakeReranker([0.2, 0.9, 0.5])
    config = RerankerConfig(candidate_strategy="union_d20_b20", dense_candidate_k=2, bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=2)
    result = RerankedRetriever(config, retriever=hybrid, reranker=scorer).retrieve("query exactly")
    assert hybrid.call == ("query exactly", 2, 2)
    assert scorer.calls == [("query exactly", ["text-shared", "text-dense", "text-bm25"])]
    assert result.original_query == "query exactly"
    assert len(result.candidates) == 3 and len(result.reranked_results) == 2
    assert [item.chunk_id for item in result.reranked_results] == ["dense", "bm25"]
    assert result.reranked_results[0].reranker_score == 0.9
    assert result.reranked_results[0].metadata["chunk_metadata"] == "dense"


def test_reranker_tie_breaking_is_deterministic_and_empty_query_is_rejected() -> None:
    hybrid = FakeHybrid()
    config = RerankerConfig(candidate_strategy="union_d10_b10", dense_candidate_k=2, bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=10)
    result = RerankedRetriever(config, retriever=hybrid, reranker=FakeReranker([1.0, 1.0, 1.0])).retrieve("q")
    assert [item.chunk_id for item in result.reranked_results] == ["shared", "dense", "bm25"]
    with pytest.raises(ValueError, match="non-empty"):
        RerankedRetriever(config, retriever=FakeHybrid(), reranker=FakeReranker([])).retrieve(" ")


def test_adaptive_pool_trigger_is_conservative_and_deterministic() -> None:
    assert needs_adaptive_candidate_pool("هل يلزم credit registry check قبل زيادة الحد؟")
    assert needs_adaptive_candidate_pool("هل يخضع 300 ألف جنيه للتسجيل؟")
    assert needs_adaptive_candidate_pool("هل يخضع ۳۰۰ ألف جنيه للتسجيل؟")
    assert not needs_adaptive_candidate_pool("ما ضوابط منح التسهيلات الائتمانية؟")
    assert not needs_adaptive_candidate_pool("query exactly")


def test_adaptive_pool_widens_only_triggered_queries() -> None:
    hybrid = FakeHybrid()
    scorer = FakeReranker([0.2, 0.9, 0.5])
    config = RerankerConfig(candidate_strategy="union_d10_b10", dense_candidate_k=2,
                            bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=2)
    result = RerankedRetriever(config, retriever=hybrid, reranker=scorer).retrieve(
        "هل يلزم credit registry check؟"
    )
    assert hybrid.call == ("هل يلزم credit registry check؟", 20, 20)
    assert result.configuration["adaptive_candidate_pool"] is True
    assert result.configuration["effective_dense_candidate_k"] == 20


def test_adaptive_pool_allows_explicit_effective_output_limit() -> None:
    config = RerankerConfig(candidate_strategy="union_d10_b10", dense_candidate_k=2,
                            bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=2)
    result = RerankedRetriever(config, retriever=FakeHybrid(), reranker=FakeReranker([1.0, 0.9, 0.8])).retrieve(
        "هل يخضع 300 ألف جنيه للتسجيل؟", output_top_k=30
    )
    assert len(result.reranked_results) == 3


def test_unavailable_cross_encoder_keeps_fused_retrieval_available(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingReranker:
        def __init__(self, config):
            raise ValueError("CUDA was requested for reranking but is not available")

    monkeypatch.setattr(reranked_module, "CrossEncoderReranker", FailingReranker)
    config = RerankerConfig(candidate_strategy="union_d20_b20", dense_candidate_k=2,
                            bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=3)
    result = reranked_module.RerankedRetriever(config, retriever=FakeHybrid()).retrieve("query")
    assert result.reranked_results
    assert result.configuration["reranker_available"] is False
    assert result.configuration["reranker_fallback"] is True
    assert "CUDA was requested" in result.configuration["reranker_error"]


def test_dense_failure_keeps_lexical_retrieval_available(monkeypatch: pytest.MonkeyPatch) -> None:
    class DenseUnavailableHybrid(FakeHybrid):
        def retrieve(self, query, dense_top_k, bm25_top_k):
            raise RuntimeError("sentence-transformers model is unavailable")

        def retrieve_bm25(self, query, top_k=None):
            return self.bm25[:top_k]

    class FailingReranker:
        def __init__(self, config):
            raise RuntimeError("reranker unavailable")

    monkeypatch.setattr(reranked_module, "CrossEncoderReranker", FailingReranker)
    config = RerankerConfig(candidate_strategy="union_d20_b20", dense_candidate_k=2,
                            bm25_candidate_k=2, rerank_candidate_limit=10, output_top_k=2)
    result = reranked_module.RerankedRetriever(config, retriever=DenseUnavailableHybrid()).retrieve("query")
    assert [item.chunk_id for item in result.reranked_results] == ["shared", "bm25"]
    assert result.configuration["retrieval_degraded"] is True
    assert "sentence-transformers" in result.configuration["retrieval_error"]


@pytest.mark.skipif(
    not all(importlib.util.find_spec(module) is not None for module in ("numpy", "faiss", "sentence_transformers")),
    reason="RAG integration dependencies are not installed",
)
def test_reranked_retriever_works_against_the_real_retrieval_bundle() -> None:
    class StableReranker:
        def score(self, query, passages):
            return [float(len(passages) - index) for index, _ in enumerate(passages)]

    config = RerankerConfig(candidate_strategy="union_d10_b10", dense_candidate_k=2, bm25_candidate_k=2, rerank_candidate_limit=4, output_top_k=4)
    result = RerankedRetriever(config, reranker=StableReranker()).retrieve("شروط منح التسهيلات الائتمانية")
    assert result.reranked_results
    assert len({item.chunk_id for item in result.candidates}) == len(result.candidates)
