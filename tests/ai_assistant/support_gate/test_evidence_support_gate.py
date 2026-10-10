from __future__ import annotations

import json

import pytest

from src.ai_assistant.context.builder import ContextBuilder
from src.ai_assistant.context.config import ContextConfig
from src.ai_assistant.context.expander import ContextExpander
from src.ai_assistant.llm.base import LLMProvider
from src.ai_assistant.llm.models import LLMResponse
from src.ai_assistant.models import ContextPack, RerankedCandidate
from src.ai_assistant.support_gate.gate import EvidenceSupportGate, parse_assessment
from src.ai_assistant.support_gate.models import EvidenceSupportAssessment


class _Source:
    def parent(self, parent_id: str):
        return {"parent_id": parent_id, "text_original": "direct source evidence"}

    def neighbors(self, chunk_id: str):
        return []


def _pack():
    candidate = RerankedCandidate("chunk-1", "doc-1", "Document", "direct source evidence", "parent-1", 1, 1, None, None,
                                  1.0, 1, None, 1, None, None, None, ["dense"], {})
    return ContextBuilder(ContextConfig(), expander=ContextExpander(_Source())).build_from_candidates("What is directly required?", [candidate])


class _Provider(LLMProvider):
    def __init__(self, text: str | Exception) -> None:
        self.text = text

    def generate(self, request):
        if isinstance(self.text, Exception):
            raise self.text
        return LLMResponse(self.text, "test", "test", 0.1, 1, 1, 2)


def _payload(**updates):
    value = {"support": "full", "supported_handles": ["E1"], "supported_aspects": ["direct requirement"],
             "unsupported_aspects": [], "reason_code": "direct_support"}
    value.update(updates)
    return json.dumps(value)


def test_typed_full_output_and_strict_schema_request():
    provider = _Provider(_payload())
    result = EvidenceSupportGate(provider).assess(_pack())
    assert result.support == "full" and result.supported_handles == ["E1"]


def test_invalid_support_level_is_rejected_by_parser():
    with pytest.raises(ValueError):
        parse_assessment(_payload(support="related"))


def test_duplicate_handles_are_deduplicated_deterministically():
    result = parse_assessment(_payload(supported_handles=["E1", "E1"]))
    assert result.supported_handles == ["E1"]


def test_unknown_external_handles_fail_closed():
    result = EvidenceSupportGate(_Provider(_payload(supported_handles=["E999"]))).assess(_pack())
    assert result.support == "none" and result.classifier_failed is True and result.supported_handles == []


def test_empty_context_is_none_without_provider_call():
    pack = ContextPack("q", [], [], [], [], {}, 0, 0, 0, 0, {})
    result = EvidenceSupportGate(_Provider(AssertionError("provider should not run"))).assess(pack)
    assert result.support == "none" and result.classifier_failed is False


def test_full_requires_supported_material_aspects():
    with pytest.raises(ValueError):
        EvidenceSupportAssessment("full", ["E1"], [], [], "direct_support")
    with pytest.raises(ValueError):
        EvidenceSupportAssessment("partial", ["E1"], ["one"], [], "partial_support")


def test_provider_and_schema_failures_default_conservatively():
    malformed = EvidenceSupportGate(_Provider("not-json")).assess(_pack())
    failed = EvidenceSupportGate(_Provider(RuntimeError("offline"))).assess(_pack())
    assert malformed.support == failed.support == "none"
    assert malformed.classifier_failed and failed.classifier_failed
