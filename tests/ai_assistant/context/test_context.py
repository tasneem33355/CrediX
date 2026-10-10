from __future__ import annotations

import json
from dataclasses import replace

import pytest

from src.ai_assistant.context.builder import ContextBuilder
from src.ai_assistant.context.config import ContextConfig, load_frozen_context_config
from src.ai_assistant.context.expander import CanonicalBundleContext, ContextExpander
from src.ai_assistant.context.selector import EvidenceSelector
from src.ai_assistant.models import RerankedCandidate


def _candidate(chunk_id: str = "chunk-a", parent_id: str = "parent-a", document_id: str = "doc-a", text: str = "alpha beta") -> RerankedCandidate:
    return RerankedCandidate(chunk_id, document_id, "Document A", text, parent_id, 1, 2, "1", "a", 2.0, 1,
                             0.1, 1, 2, 0.9, 0.8, ["dense", "bm25"], {"source": "test"})


class _Source:
    def __init__(self) -> None:
        self.parents = {
            "parent-a": {"parent_id": "parent-a", "text_original": "parent alpha beta gamma"},
            "parent-b": {"parent_id": "parent-b", "text_original": "parent beta"},
        }

    def parent(self, parent_id: str):
        return self.parents[parent_id]

    def neighbors(self, chunk_id: str):
        return []


class _NeighborSource(_Source):
    def neighbors(self, chunk_id: str):
        return [
            {"chunk_id": "chunk-before", "text_original": "before text", "document_id": "doc-a", "parent_id": "parent-before"},
            {"chunk_id": chunk_id, "text_original": "alpha beta", "document_id": "doc-a", "parent_id": "parent-a"},
            {"chunk_id": "chunk-after", "text_original": "after text", "document_id": "doc-a", "parent_id": "parent-after"},
        ]


def _builder(config: ContextConfig) -> ContextBuilder:
    return ContextBuilder(config, expander=ContextExpander(_Source()))


def test_chunk_only_expansion_and_metadata_preservation():
    evidence = ContextExpander(_Source()).expand(_candidate(), 1, "chunk_only")
    assert evidence.expanded_text == "alpha beta"
    assert evidence.metadata["source"] == "test"
    assert evidence.dense_rank == 1 and evidence.rrf_score == 0.1


def test_parent_and_chunk_plus_parent_expansion():
    expander = ContextExpander(_Source())
    assert expander.expand(_candidate(), 1, "parent").expanded_text == "parent alpha beta gamma"
    combined = expander.expand(_candidate(text="different chunk"), 1, "chunk_plus_parent")
    assert combined.expanded_text == "different chunk\n\nparent alpha beta gamma"
    contained = expander.expand(_candidate(), 1, "chunk_plus_parent")
    assert contained.expanded_text == "parent alpha beta gamma"
    assert contained.expansion_type == "parent_containing_chunk"


def test_neighbor_expansion_flag_is_applied_and_preserves_source_chunk_ids():
    config = ContextConfig(candidate_top_k=1, neighbor_expansion=True, max_context_tokens=20)
    builder = ContextBuilder(config, expander=ContextExpander(_NeighborSource()))
    result = builder.build_from_candidates("q", [_candidate()])
    item = result.evidence_items[0]
    assert item.expansion_type == "neighbor_1"
    assert item.chunk_ids == ["chunk-before", "chunk-a", "chunk-after"]
    assert "before text" in item.expanded_text and "after text" in item.expanded_text
    assert result.citation_map["E1"]["chunk_ids"] == item.chunk_ids
    assert result.citation_map["E1"]["parent_ids"] == ["parent-before", "parent-a", "parent-after"]
    assert result.selected_parent_ids == ["parent-before", "parent-a", "parent-after"]


def test_parent_deduplication_preserves_contributing_chunk_ids():
    config = ContextConfig(expansion_strategy="parent_deduplicated", deduplicate_parents=True)
    result = _builder(config).build_from_candidates("q", [_candidate(), replace(_candidate(), chunk_id="chunk-b", reranker_score=1.0)])
    assert result.evidence_count == 1
    assert result.evidence_items[0].chunk_ids == ["chunk-a", "chunk-b"]
    assert result.configuration["duplicate_blocks_removed"] == 1


def test_different_documents_are_not_merged_and_order_is_preserved():
    config = ContextConfig(expansion_strategy="chunk_only")
    result = _builder(config).build_from_candidates("q", [_candidate(), _candidate("chunk-b", "parent-b", "doc-b", "other text")])
    assert [item.primary_chunk_id for item in result.evidence_items] == ["chunk-a", "chunk-b"]
    assert result.document_ids == ["doc-a", "doc-b"]


def test_identical_text_in_different_documents_is_not_deduplicated():
    result = _builder(ContextConfig()).build_from_candidates(
        "q", [_candidate(text="shared"), _candidate("chunk-b", "parent-b", "doc-b", "shared")]
    )
    assert result.evidence_count == 2


def test_identical_chunk_text_in_one_document_is_deduplicated():
    result = _builder(ContextConfig()).build_from_candidates("q", [_candidate(), _candidate("chunk-b", text="alpha beta")])
    assert result.evidence_count == 1
    assert result.configuration["duplicate_blocks_removed"] == 1


def test_budget_and_complete_block_policy():
    config = ContextConfig(expansion_strategy="chunk_only", max_context_tokens=2)
    result = _builder(config).build_from_candidates("q", [_candidate(text="one two"), _candidate("b", "parent-b", text="three")])
    assert result.estimated_context_tokens == 2
    assert [item.primary_chunk_id for item in result.evidence_items] == ["chunk-a"]


def test_citations_map_rendering_and_original_query():
    result = _builder(ContextConfig()).build_from_candidates("original q", [_candidate()])
    assert result.original_query == "original q"
    assert result.evidence_items[0].citation_handle == "E1"
    assert result.citation_map["E1"]["chunk_ids"] == ["chunk-a"]
    assert "[EVIDENCE E1]" in result.render_structured()


def test_citation_handles_are_deterministic_for_multiple_blocks():
    result = _builder(ContextConfig()).build_from_candidates("q", [_candidate(), _candidate("chunk-b", "parent-b", text="other")])
    assert [item.citation_handle for item in result.evidence_items] == ["E1", "E2"]
    assert list(result.citation_map) == ["E1", "E2"]


@pytest.mark.parametrize("kwargs", [
    {"candidate_top_k": 0}, {"max_context_tokens": 0}, {"expansion_strategy": "invalid"},
])
def test_invalid_config_rejected(kwargs):
    with pytest.raises(ValueError):
        ContextConfig(**kwargs)


def test_real_bundle_parent_lookup_and_safe_neighbors():
    source = CanonicalBundleContext()
    chunk = next(iter(source.chunks.values()))
    assert source.parent(chunk["parent_id"])["parent_id"] == chunk["parent_id"]
    assert all(row["document_id"] == chunk["document_id"] for row in source.neighbors(chunk["chunk_id"]))


def test_frozen_config_loader_missing_and_malformed(tmp_path):
    with pytest.raises(ValueError, match="not found"):
        load_frozen_context_config(tmp_path / "missing.json")
    bad = tmp_path / "bad.json"
    bad.write_text("{not JSON", encoding="utf-8")
    with pytest.raises(ValueError, match="invalid JSON"):
        load_frozen_context_config(bad)
    incomplete = tmp_path / "incomplete.json"
    incomplete.write_text('{"candidate_top_k": 3}', encoding="utf-8")
    with pytest.raises(ValueError, match="missing"):
        load_frozen_context_config(incomplete)


def test_frozen_config_loader_and_default_builder(tmp_path):
    path = tmp_path / "config.json"
    path.write_text(json.dumps(ContextConfig(candidate_top_k=3).to_dict()), encoding="utf-8")
    assert load_frozen_context_config(path).candidate_top_k == 3
    # Explicit injection remains independent of the runtime's frozen file.
    assert _builder(ContextConfig(candidate_top_k=3)).config.candidate_top_k == 3


def test_default_context_builder_automatically_uses_frozen_config():
    assert ContextBuilder().config == load_frozen_context_config()
