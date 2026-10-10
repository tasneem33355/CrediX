from __future__ import annotations

from types import SimpleNamespace

import pytest
import torch

from src.ai_assistant.reranking.config import RerankerConfig
from src.ai_assistant.reranking.cross_encoder import CrossEncoderReranker, resolve_device


class FakeTokenizer:
    def __init__(self) -> None:
        self.calls = []

    def __call__(self, queries, passages, **kwargs):
        self.calls.append((queries, passages, kwargs))
        return {"input_ids": torch.ones((len(passages), 2), dtype=torch.long)}


class FakeModel:
    def __init__(self) -> None:
        self.config = SimpleNamespace(_commit_hash="fixture-revision")

    def __call__(self, **kwargs):
        return SimpleNamespace(logits=torch.tensor([[2.0], [1.0]][:kwargs["input_ids"].shape[0]]))


def test_cross_encoder_pairs_original_query_with_candidate_text_and_maps_raw_scores() -> None:
    tokenizer = FakeTokenizer()
    reranker = CrossEncoderReranker(RerankerConfig(batch_size=2), tokenizer=tokenizer, model=FakeModel())
    assert reranker.score("original query", ["first passage", "second passage"]) == [2.0, 1.0]
    queries, passages, options = tokenizer.calls[0]
    assert queries == ["original query", "original query"]
    assert passages == ["first passage", "second passage"]
    assert options["padding"] and options["truncation"] and options["max_length"] == 512


def test_cross_encoder_scores_all_candidates_in_batches_and_rejects_empty_query() -> None:
    reranker = CrossEncoderReranker(RerankerConfig(batch_size=2), tokenizer=FakeTokenizer(), model=FakeModel())
    assert len(reranker.score("q", ["a", "b", "c"])) == 3
    with pytest.raises(ValueError, match="non-empty"):
        reranker.score("  ", ["passage"])
    with pytest.raises(ValueError, match="non-empty"):
        reranker.score("q", [""])


def test_device_resolution_and_runtime_diagnostics() -> None:
    class FakeTorch:
        class cuda:
            @staticmethod
            def is_available(): return True

    assert resolve_device("cpu", FakeTorch) == "cpu"
    assert resolve_device("auto", FakeTorch) == "cuda"
    assert resolve_device("cuda", FakeTorch) == "cuda"
    class NoCuda:
        class cuda:
            @staticmethod
            def is_available(): return False
    assert resolve_device("auto", NoCuda) == "cpu"
    with pytest.raises(ValueError, match="requested"):
        resolve_device("cuda", NoCuda)
    with pytest.raises(ValueError, match="cpu.*cuda.*auto"):
        resolve_device("invalid", NoCuda)
    reranker = CrossEncoderReranker(RerankerConfig(batch_size=2), tokenizer=FakeTokenizer(), model=FakeModel())
    assert reranker.warmup() >= 0.0
    info = reranker.runtime_info()
    assert info.model_id == "BAAI/bge-reranker-v2-m3"
    assert info.model_revision == "953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e"
    assert info.resolved_device == resolve_device("auto")


@pytest.mark.parametrize("kwargs", [
    {"device": "invalid"}, {"batch_size": 0}, {"max_length": 0}, {"output_top_k": 0},
    {"candidate_strategy": "unknown"},
])
def test_invalid_reranker_config_is_rejected(kwargs: dict) -> None:
    with pytest.raises(ValueError):
        RerankerConfig(**kwargs)
