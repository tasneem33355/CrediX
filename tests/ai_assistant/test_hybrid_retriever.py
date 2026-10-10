"""Integration tests for the standalone hybrid retrieval baseline."""
from __future__ import annotations

import importlib.util
from types import ModuleType

import pytest

from src.ai_assistant.retrieval.hybrid_retriever import HybridRetriever


QUERY = "ما هي شروط منح تسهيلات ائتمانية للعميل بالنقد الأجنبي؟"


def _rag_runtime_available() -> bool:
    return all(importlib.util.find_spec(module) is not None for module in ("numpy", "faiss", "sentence_transformers"))


requires_rag_runtime = pytest.mark.skipif(
    not _rag_runtime_available(),
    reason="RAG integration dependencies are not installed",
)


@pytest.fixture(scope="module")
def retriever() -> HybridRetriever:
    return HybridRetriever()


def test_empty_query_raises_clear_validation_error() -> None:
    retriever = HybridRetriever(adapter=ModuleType("unused_adapter"))
    with pytest.raises(ValueError, match="empty|whitespace"):
        retriever.retrieve("   ")


@requires_rag_runtime
def test_dense_retrieval_uses_release_bundle_and_respects_top_k(retriever: HybridRetriever) -> None:
    candidates = retriever.retrieve_dense(QUERY, top_k=2)
    assert 1 <= len(candidates) <= 2
    assert all(candidate.retriever == "dense" for candidate in candidates)
    _assert_complete_candidates(retriever, candidates)


@requires_rag_runtime
def test_bm25_retrieval_uses_release_bundle_and_respects_top_k(retriever: HybridRetriever) -> None:
    candidates = retriever.retrieve_bm25(QUERY, top_k=2)
    assert 1 <= len(candidates) <= 2
    assert all(candidate.retriever == "bm25" for candidate in candidates)
    _assert_complete_candidates(retriever, candidates)


@requires_rag_runtime
def test_retrieval_keeps_dense_and_bm25_results_separate(retriever: HybridRetriever) -> None:
    result = retriever.retrieve(QUERY, dense_top_k=1, bm25_top_k=1)
    assert result.original_query == QUERY
    assert len(result.dense_results) == 1
    assert len(result.bm25_results) == 1
    assert result.dense_results[0].retriever == "dense"
    assert result.bm25_results[0].retriever == "bm25"
    assert not hasattr(retriever, "rrf")
    assert not hasattr(retriever, "rerank")


def _assert_complete_candidates(retriever: HybridRetriever, candidates) -> None:
    for candidate in candidates:
        assert candidate.chunk_id
        assert candidate.document_id
        assert candidate.text_original
        assert candidate.parent_id
        assert isinstance(candidate.score, float)
        assert retriever._adapter.get_chunk(candidate.chunk_id)["chunk_id"] == candidate.chunk_id
        assert retriever._adapter.get_parent_context(candidate.parent_id)["parent_id"] == candidate.parent_id
