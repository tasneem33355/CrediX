from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.ai_assistant.models import HybridRetrievalResult, RetrievalCandidate
from src.ai_assistant.reranking.config import MODEL_ID, MODEL_REVISION, RerankerConfig, load_frozen_reranker_config
from src.ai_assistant.reranking.reranked_retriever import RerankedRetriever


def _candidate(chunk_id: str) -> RetrievalCandidate:
    return RetrievalCandidate(chunk_id, "DOC", "Document", "passage", "PARENT", None, None, None, None, 1.0,
                              "dense", {"parent_id": "PARENT"})


def test_frozen_config_is_selected_valid_and_pinned() -> None:
    config = load_frozen_reranker_config()
    assert config.model_id == MODEL_ID
    assert config.model_revision == MODEL_REVISION
    assert config.candidate_strategy == "union_d10_b10"
    assert config.dense_candidate_k == 10
    assert config.bm25_candidate_k == 10
    assert config.rerank_candidate_limit == 20
    assert config.output_top_k == 20
    assert config.output_top_k <= config.rerank_candidate_limit


def test_device_environment_override_is_respected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CREDIX_RERANKER_DEVICE", "cpu")
    assert load_frozen_reranker_config().device == "cpu"
    monkeypatch.setenv("CREDIX_RERANKER_DEVICE", "invalid")
    with pytest.raises(ValueError, match="cpu.*cuda.*auto"):
        load_frozen_reranker_config()


def test_missing_and_malformed_frozen_config_fail_clearly(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="not found"):
        load_frozen_reranker_config(tmp_path / "missing.json")
    malformed = tmp_path / "malformed.json"
    malformed.write_text("{", encoding="utf-8")
    with pytest.raises(ValueError, match="invalid JSON"):
        load_frozen_reranker_config(malformed)


def test_output_top_k_cannot_exceed_candidate_limit() -> None:
    with pytest.raises(ValueError, match="must not exceed"):
        RerankerConfig(rerank_candidate_limit=20, output_top_k=21)


def test_default_retriever_loads_frozen_config_and_explicit_injection_still_works() -> None:
    class FakeHybrid:
        def retrieve(self, query, dense_top_k, bm25_top_k):
            return HybridRetrievalResult(query, [_candidate("dense")], [_candidate("bm25")])

    class FakeReranker:
        def score(self, query, passages):
            return [float(index) for index, _ in enumerate(passages)]

    default = RerankedRetriever(retriever=FakeHybrid(), reranker=FakeReranker())
    assert default.config == load_frozen_reranker_config()
    injected = RerankerConfig(candidate_strategy="dense_top_20", dense_candidate_k=1, bm25_candidate_k=1,
                              rerank_candidate_limit=1, output_top_k=1)
    assert RerankedRetriever(injected, retriever=FakeHybrid(), reranker=FakeReranker()).config == injected
