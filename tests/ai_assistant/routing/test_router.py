from __future__ import annotations

from src.ai_assistant.models import ContextPack
from src.ai_assistant.generation.general import GeneralAnswer
from src.ai_assistant.generation.response import GroundedAnswer
from src.ai_assistant.routing.router import RoutedAssistant, decompose_query
from src.ai_assistant.support_gate.models import EvidenceSupportAssessment


def _pack(query: str, evidence_count: int = 1) -> ContextPack:
    return ContextPack(query, [], [], [], [], {}, evidence_count, 0, 0, 0, {})


class FakeBuilder:
    def __init__(self, evidence_count: int = 1, events: list[str] | None = None):
        self.evidence_count = evidence_count
        self.events = events if events is not None else []

    def build(self, query: str) -> ContextPack:
        self.events.append("probe")
        return _pack(query, self.evidence_count)


class FailingBuilder(FakeBuilder):
    def build(self, query: str) -> ContextPack:
        raise RuntimeError("index unavailable")


class FakeGate:
    def __init__(self, support: str = "full", events: list[str] | None = None):
        self.support = support
        self.events = events if events is not None else []

    def assess(self, context_pack: ContextPack) -> EvidenceSupportAssessment:
        self.events.append("gate")
        if self.support == "full":
            return EvidenceSupportAssessment("full", ["E1"], ["direct fact"], [], "direct_support")
        return EvidenceSupportAssessment("none", [], [], ["unsupported"], "missing_required_fact")


class FailedGate(FakeGate):
    def assess(self, context_pack: ContextPack) -> EvidenceSupportAssessment:
        return EvidenceSupportAssessment("full", ["E1"], ["claim"], [], "direct_support", classifier_failed=True)


class UnusedGenerator:
    def answer(self, query: str):
        raise AssertionError("generation must not run during decide")


class GroundedGenerator:
    def answer(self, query: str) -> GroundedAnswer:
        return GroundedAnswer(query, "The sourced fact.", False, ["E1"], [], "fake", "model", 0.1, 1, 1, 2, "validated", "v1", {})


class GeneralGenerator:
    def answer(self, query: str) -> GeneralAnswer:
        return GeneralAnswer(query, "The general explanation.", "general", "ai_generated", [], "AI-generated", "fake", "model", 0.1, 1, 1, 2)


def test_decomposition_is_bounded_and_preserves_source_and_general_claims():
    claims = decompose_query("What is the limit according to policy and explain why it matters?")
    assert [claim.kind for claim in claims] == ["source", "general"]
    assert claims[0].source_requested and claims[1].general_requested

    # Colloquial source wording may not contain an explicit policy/document
    # keyword; the explicit hybrid split still makes its first clause source.
    arabic_claims = decompose_query("ما الذي ينبغي أن أراعيه دراسة مخاطر القرض قبل منحه واشرح أهميته؟")
    assert [claim.kind for claim in arabic_claims] == ["source", "general"]
    assert arabic_claims[0].source_requested


def test_routing_matrix_and_call_order():
    events: list[str] = []
    grounded = RoutedAssistant(context_builder=FakeBuilder(events=events), support_gate=FakeGate(events=events), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert grounded.decide("What is the limit according to policy?").mode == "grounded"
    assert events == ["probe", "gate"]

    general = RoutedAssistant(context_builder=FakeBuilder(events=[]), support_gate=FakeGate(), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert general.decide("Explain credit risk in general").mode == "general"
    assert general.decide("ما معنى مخاطر الائتمان بشكل عام؟").mode == "general"

    hybrid = RoutedAssistant(context_builder=FakeBuilder(events=[]), support_gate=FakeGate(), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert hybrid.decide("What is the limit according to policy and explain why it matters?").mode == "hybrid"
    assert hybrid.decide("ما الذي ينبغي أن أراعيه دراسة مخاطر القرض قبل منحه واشرح أهميته؟").mode == "hybrid"


def test_unsupported_source_and_numeric_or_negated_queries_fail_closed():
    unsupported = RoutedAssistant(context_builder=FakeBuilder(), support_gate=FakeGate("none"), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert unsupported.decide("What is the limit according to policy?").mode == "insufficient_evidence"
    assert unsupported.decide("Is amount 300000 allowed?").mode == "insufficient_evidence"
    failed = RoutedAssistant(context_builder=FakeBuilder(), support_gate=FailedGate(), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert failed.decide("What is the limit according to policy?").mode == "insufficient_evidence"
    probe_failed = RoutedAssistant(context_builder=FailingBuilder(), support_gate=FakeGate(), grounded=UnusedGenerator(), general=UnusedGenerator())
    assert probe_failed.decide("What is the limit according to policy?").mode == "insufficient_evidence"


def test_answer_keeps_generation_paths_isolated_and_returns_typed_segments():
    assistant = RoutedAssistant(
        context_builder=FakeBuilder(),
        support_gate=FakeGate(),
        grounded=GroundedGenerator(),
        general=GeneralGenerator(),
    )
    result = assistant.answer("What is the limit according to policy and explain why it matters?")
    assert result.answer_mode == "hybrid"
    assert result.provenance == "mixed"
    assert [segment.source_type for segment in result.segments] == ["retrieved", "ai_generated"]
    assert result.segments[0].citation_handles == ["E1"]
    assert result.segments[1].citation_handles == []
