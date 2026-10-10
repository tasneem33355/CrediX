import json
from pathlib import Path

import pytest

from src.ai_assistant.evaluation.evaluate_retrieval import DEFAULT_BUNDLE, DEFAULT_DATASET, DEFAULT_META, load_cases, validate_cases, validate_metadata


def test_reviewed_dataset_validates_against_current_bundle() -> None:
    cases = load_cases(DEFAULT_DATASET)
    validate_cases(cases, DEFAULT_BUNDLE)
    validate_metadata(cases, json.loads(DEFAULT_META.read_text(encoding="utf-8")), DEFAULT_BUNDLE)


def test_duplicate_and_invalid_shapes_are_rejected(tmp_path: Path) -> None:
    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[0])
    path = tmp_path / "cases.jsonl"
    path.write_text(json.dumps(row) + "\n" + json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="duplicate"):
        load_cases(path)
    row["primary_chunk_id"] = "not-relevant"
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="primary"):
        load_cases(path)


def test_reference_and_no_answer_validation_failures(tmp_path: Path) -> None:
    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[0])
    row["relevant_chunk_ids"] = ["missing"]
    row["primary_chunk_id"] = "missing"
    path = tmp_path / "bad.jsonl"
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unknown relevant chunk"):
        validate_cases(load_cases(path), DEFAULT_BUNDLE)
    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[-1])
    row["relevant_chunk_ids"] = ["x"]
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unanswerable"):
        load_cases(path)


def test_invalid_parent_and_document_mismatch_are_rejected(tmp_path: Path) -> None:
    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[0])
    row["relevant_parent_ids"].append("unknown-parent")
    path = tmp_path / "bad-parent.jsonl"
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="unknown relevant parent"):
        validate_cases(load_cases(path), DEFAULT_BUNDLE)
    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[0])
    row["expected_document_ids"] = ["DOC2"]
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="expected_document_ids"):
        validate_cases(load_cases(path), DEFAULT_BUNDLE)

    row = json.loads(DEFAULT_DATASET.read_text(encoding="utf-8").splitlines()[0])
    # Keep the chunk labels intact but make the parent label point to a
    # different document.  This must fail rather than silently accepting an
    # internally inconsistent reviewed label.
    parents = [
        json.loads(line)
        for line in (DEFAULT_BUNDLE / "parents.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    other_parent = next(parent["parent_id"] for parent in parents if parent["document_id"] != row["expected_document_ids"][0])
    row["relevant_parent_ids"] = [row["relevant_parent_ids"][0], other_parent]
    path.write_text(json.dumps(row) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="parent document"):
        validate_cases(load_cases(path), DEFAULT_BUNDLE)
