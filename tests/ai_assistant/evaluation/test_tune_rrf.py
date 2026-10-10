from __future__ import annotations

from src.ai_assistant.evaluation.tune_rrf import (
    CachedRanking,
    candidate_slices,
    cache_rankings,
    evaluate_cached_configuration,
    grid_search,
    load_dev_cases,
)
from src.ai_assistant.models import RetrievalCandidate
from src.ai_assistant.retrieval.rrf import RRFConfig


def _candidate(chunk_id: str, score: float) -> RetrievalCandidate:
    return RetrievalCandidate(chunk_id, "DOC", "Document", chunk_id, "PARENT", None, None, None, None, score, "dense", {"parent_id": "PARENT"})


def test_dev_loader_uses_only_dev_ids() -> None:
    from src.ai_assistant.evaluation import evaluate_retrieval as evaluator

    cases, _ = load_dev_cases(evaluator.DEFAULT_V2_DATASET, evaluator.DEFAULT_V2_META, evaluator.DEFAULT_SPLITS, evaluator.DEFAULT_BUNDLE)
    test_ids = set(__import__("json").loads(evaluator.DEFAULT_SPLITS.read_text(encoding="utf-8"))["test"])
    assert len(cases) == 56
    assert not {case.query_id for case in cases} & test_ids


def test_cache_is_reused_candidate_slicing_and_grid_are_deterministic() -> None:
    from src.ai_assistant.evaluation import evaluate_retrieval as evaluator

    cases, _ = load_dev_cases(evaluator.DEFAULT_V2_DATASET, evaluator.DEFAULT_V2_META, evaluator.DEFAULT_SPLITS, evaluator.DEFAULT_BUNDLE)

    class CountingRetriever:
        def __init__(self) -> None:
            self.dense_calls = self.bm25_calls = 0

        def retrieve_dense(self, query: str, top_k: int):
            self.dense_calls += 1
            return [_candidate("relevant", 1.0), _candidate("noise", 0.5)]

        def retrieve_bm25(self, query: str, top_k: int):
            self.bm25_calls += 1
            return [_candidate("other", 2.0), _candidate("relevant", 1.0)]

    retriever = CountingRetriever()
    cached, _ = cache_rankings(cases[:2], retriever, max_candidates=50)
    assert (retriever.dense_calls, retriever.bm25_calls) == (2, 2)
    assert [item.chunk_id for item in candidate_slices(cached[0], 1, 2)[0]] == ["relevant"]
    first = grid_search(cached)
    second = grid_search(cached)
    assert len(first) == 576
    assert first == second
    assert (retriever.dense_calls, retriever.bm25_calls) == (2, 2)


def test_fused_metrics_are_calculated_from_fused_chunk_ids() -> None:
    from src.ai_assistant.evaluation import evaluate_retrieval as evaluator

    case, _ = load_dev_cases(evaluator.DEFAULT_V2_DATASET, evaluator.DEFAULT_V2_META, evaluator.DEFAULT_SPLITS, evaluator.DEFAULT_BUNDLE)
    fixture = CachedRanking(case[0], [_candidate("noise", 1.0), _candidate(case[0].relevant_chunk_ids[0], 0.5)], [_candidate(case[0].relevant_chunk_ids[0], 2.0)])
    metrics, _, _, _ = evaluate_cached_configuration([fixture], RRFConfig(dense_candidate_k=2, bm25_candidate_k=1, fusion_top_k=10, rrf_k=10))
    assert metrics["recall_at_1"] == 1.0
    assert metrics["mrr_at_10"] == 1.0
