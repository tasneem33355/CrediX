import json
from pathlib import Path

import pytest

from src.ai_assistant.evaluation import evaluate_retrieval as evaluator


DATASET = evaluator.DEFAULT_V2_DATASET
META = evaluator.DEFAULT_V2_META
SPLITS = evaluator.DEFAULT_SPLITS


def _cases_and_meta():
    return evaluator.load_cases(DATASET), json.loads(META.read_text(encoding="utf-8"))


def _write_splits(path: Path, splits: dict[str, list[str]]) -> Path:
    path.write_text(json.dumps(splits), encoding="utf-8")
    return path


def test_v2_split_assignments_are_complete_non_overlapping_and_have_expected_counts() -> None:
    cases, meta = _cases_and_meta()
    splits = evaluator.load_and_validate_splits(cases, SPLITS, meta)
    answerable = {case.query_id for case in cases if case.answerable}
    no_answer = {case.query_id for case in cases if not case.answerable}

    assert not set(splits["dev"]) & set(splits["test"])
    assert set(splits["dev"]) | set(splits["test"]) == answerable
    assert not set(splits["dev_no_answer"]) & set(splits["test_no_answer"])
    assert set(splits["dev_no_answer"]) | set(splits["test_no_answer"]) == no_answer
    assert len(splits["dev"]) == 56
    assert len(splits["test"]) == 24
    assert len(splits["dev_no_answer"]) == 7
    assert len(splits["test_no_answer"]) == 3


def test_invalid_split_ids_missing_ids_and_duplicates_are_rejected(tmp_path: Path) -> None:
    cases, meta = _cases_and_meta()
    baseline = evaluator.load_and_validate_splits(cases, SPLITS, meta)

    unknown = {name: list(ids) for name, ids in baseline.items()}
    unknown["dev"][0] = "unknown-id"
    with pytest.raises(ValueError, match="unknown or wrong-scope"):
        evaluator.load_and_validate_splits(cases, _write_splits(tmp_path / "unknown.json", unknown), meta)

    missing = {name: list(ids) for name, ids in baseline.items()}
    missing["dev"].pop()
    with pytest.raises(ValueError, match="missing query IDs"):
        evaluator.load_and_validate_splits(cases, _write_splits(tmp_path / "missing.json", missing), meta)

    duplicate = {name: list(ids) for name, ids in baseline.items()}
    duplicate["dev"].append(duplicate["dev"][0])
    with pytest.raises(ValueError, match="duplicate"):
        evaluator.load_and_validate_splits(cases, _write_splits(tmp_path / "duplicate.json", duplicate), meta)

    malformed = {name: list(ids) for name, ids in baseline.items()}
    malformed["dev"] = "not-a-list"
    with pytest.raises(ValueError, match="must be a list"):
        evaluator.load_and_validate_splits(cases, _write_splits(tmp_path / "malformed.json", malformed), meta)

    unknown_count = dict(meta)
    unknown_count["split_counts"] = {**meta["split_counts"], "holdout": 1}
    with pytest.raises(ValueError, match="unknown keys"):
        evaluator.load_and_validate_splits(cases, SPLITS, unknown_count)


def test_v2_evidence_labels_are_consistent() -> None:
    cases, _ = _cases_and_meta()
    singles = [case for case in cases if case.answerable and len(case.relevant_chunk_ids) == 1]
    multis = [case for case in cases if case.answerable and len(case.relevant_chunk_ids) >= 2]

    assert len(singles) == 60
    assert len(multis) == 20
    assert all(case.primary_chunk_id in case.relevant_chunk_ids for case in cases if case.answerable)


@pytest.mark.parametrize(("split", "expected_count", "expected_unanswerable"),
                         [("dev", 56, 0), ("test", 24, 0), ("all", 80, 10)])
def test_evaluate_selects_only_requested_answerable_scope(monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
                                                          split: str, expected_count: int,
                                                          expected_unanswerable: int) -> None:
    seen: list[str] = []

    def fake_run(cases):
        seen.extend(case.query_id for case in cases if case.answerable)
        metrics = {"recall_at_1": 1.0}
        summary = {"aggregate_metrics": metrics, "by_document": {}, "by_query_type": {},
                   "by_difficulty": {}, "by_language": {}}
        diagnostics = [{"query_id": case.query_id, "dense_first_relevant_rank": 1,
                        "bm25_first_relevant_rank": 1} for case in cases if case.answerable]
        return {"dense": summary, "bm25": summary}, {"per_query": diagnostics}

    monkeypatch.setattr(evaluator, "_run_retriever", fake_run)
    report = evaluator.evaluate(DATASET, META, evaluator.DEFAULT_BUNDLE, tmp_path, SPLITS, split)

    assert report["split"] == split
    assert report["dataset_summary"]["answerable_queries"] == expected_count
    assert report["dataset_summary"]["unanswerable_queries"] == expected_unanswerable
    assert report["dataset_summary"]["unanswerable_queries_total"] == 10
    assert len(seen) == expected_count
    assert all(not query_id.startswith("NA-") for query_id in seen)
