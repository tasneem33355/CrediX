from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from src.rag.validate_release_candidate import ReleaseValidationError, validate_runtime_bundle
from src.rag import retrieval_adapter


def _write_bundle(tmp_path: Path, *, status: str = "production_released", eligible: bool = True) -> Path:
    artifact = tmp_path / "chunks.jsonl"
    artifact.write_text('{"chunk_id":"C1"}\n', encoding="utf-8")
    manifest = {
        "schema_version": "1.0",
        "status": status,
        "release_status": status,
        "production_release_eligible": eligible,
        "pending_verification_count": 0,
        "release_blockers": [],
        "artifacts_sha256": {
            "chunks.jsonl": hashlib.sha256(artifact.read_bytes()).hexdigest(),
        },
    }
    (tmp_path / "release_manifest.json").write_text(
        json.dumps(manifest), encoding="utf-8"
    )
    return tmp_path


def test_runtime_bundle_requires_intact_production_release(tmp_path: Path) -> None:
    bundle = _write_bundle(tmp_path)
    result = validate_runtime_bundle(bundle)
    assert result["release_status"] == "production_released"
    assert result["production_release_eligible"] is True
    assert result["artifact_hashes"]["chunks.jsonl"]["matches"] is True


@pytest.mark.parametrize(
    ("status", "eligible"),
    [("candidate_only", False), ("production_released", False)],
)
def test_runtime_bundle_rejects_nonproduction_or_ineligible_release(
    tmp_path: Path, status: str, eligible: bool
) -> None:
    with pytest.raises(ReleaseValidationError, match="production"):
        validate_runtime_bundle(_write_bundle(tmp_path, status=status, eligible=eligible))


def test_runtime_bundle_rejects_hash_mismatch(tmp_path: Path) -> None:
    bundle = _write_bundle(tmp_path)
    manifest_path = bundle / "release_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["artifacts_sha256"]["chunks.jsonl"] = "0" * 64
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ReleaseValidationError, match="hash mismatch"):
        validate_runtime_bundle(bundle)


def test_runtime_bundle_rejects_conflicting_status_fields(tmp_path: Path) -> None:
    bundle = _write_bundle(tmp_path)
    manifest_path = bundle / "release_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["status"] = "candidate_only"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ReleaseValidationError, match="conflicting status"):
        validate_runtime_bundle(bundle)


def test_runtime_bundle_rejects_artifact_path_escape(tmp_path: Path) -> None:
    bundle = _write_bundle(tmp_path)
    outside = tmp_path.parent / "outside.txt"
    outside.write_text("outside", encoding="utf-8")
    manifest_path = bundle / "release_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    name = "../outside.txt"
    manifest["artifacts_sha256"] = {
        name: hashlib.sha256(outside.read_bytes()).hexdigest(),
    }
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(ReleaseValidationError, match="escapes"):
        validate_runtime_bundle(bundle)


def test_retrieval_adapter_fails_closed_for_candidate_override(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    bundle = _write_bundle(tmp_path, status="candidate_only", eligible=False)
    monkeypatch.setenv("CREDIX_RAG_INDEX_DIR", str(bundle))
    retrieval_adapter._corpus.cache_clear()
    with pytest.raises(ReleaseValidationError, match="production"):
        retrieval_adapter.bm25_search("query", top_k=1)
