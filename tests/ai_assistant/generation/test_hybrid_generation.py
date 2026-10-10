from __future__ import annotations

import pytest

from src.ai_assistant.generation.general import GeneralAnswer
from src.ai_assistant.generation.hybrid import HybridAssistant, HybridSegment, split_hybrid_query, validate_hybrid_segments
from src.ai_assistant.generation.response import GroundedAnswer


class StubGrounded:
    def __init__(self, answer: GroundedAnswer):
        self.answer_value = answer

    def answer(self, query: str) -> GroundedAnswer:
        return self.answer_value


class StubGeneral:
    def __init__(self, answer: GeneralAnswer):
        self.answer_value = answer

    def answer(self, query: str) -> GeneralAnswer:
        return self.answer_value


def grounded(answer: str = "The limit is 300,000.", *, no_answer: bool = False) -> GroundedAnswer:
    return GroundedAnswer("source", answer, no_answer, [] if no_answer else ["E1"], [], "fake", "model", 0.1, 1, 2, 3, "validated", "v1", {})


def general(answer: str = "This explains why the limit matters.") -> GeneralAnswer:
    return GeneralAnswer("explain", answer, "general", "ai_generated", [], "AI-generated", "fake", "model", 0.1, 1, 2, 3)


def test_split_requires_explicit_source_then_explanation_boundary():
    assert split_hybrid_query("What is the limit according to policy and explain why it matters?") == (
        "What is the limit according to policy",
        "explain why it matters",
    )
    assert split_hybrid_query("What is credit risk?") is None


def test_split_supports_arabic_source_and_explanation_boundary():
    assert split_hybrid_query("ما الحد حسب اللائحة واشرح أهميته؟") == (
        "ما الحد حسب اللائحة",
        "اشرح أهميته",
    )


def test_hybrid_returns_claim_level_segments_with_separate_provenance():
    result = HybridAssistant(grounded=StubGrounded(grounded()), general=StubGeneral(general())).answer(
        "What is the limit according to policy and explain why it matters?"
    )
    assert result.answer_mode == "hybrid"
    assert result.provenance == "mixed"
    assert [segment.source_type for segment in result.segments] == ["retrieved", "ai_generated"]
    assert result.segments[0].citation_handles == ["E1"]
    assert result.segments[1].citation_handles == []
    validate_hybrid_segments(result.segments)


def test_hybrid_fails_closed_to_insufficient_evidence_without_general_mixing():
    result = HybridAssistant(grounded=StubGrounded(grounded("Not enough evidence.", no_answer=True)), general=StubGeneral(general())).answer(
        "What is the limit according to policy and explain why it matters?"
    )
    assert result.answer_mode == "insufficient_evidence"
    assert result.citations == []
    assert len(result.segments) == 1
    assert result.segments[0].source_type == "retrieved"
    assert result.segments[0].support_status == "unsupported"


def test_segment_validator_rejects_citations_on_ai_text():
    with pytest.raises(ValueError):
        validate_hybrid_segments([HybridSegment("general", "ai_generated", ["E1"], "inference")])
