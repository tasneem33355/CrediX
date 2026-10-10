from __future__ import annotations

import inspect
from types import SimpleNamespace

import pytest

from src.ai_assistant.generation.citations import canonicalize_citations, parse_grounded_result, raw_first_pass_payload, validate_citations
from src.ai_assistant.generation.config import GenerationConfig, load_generation_config
from src.ai_assistant.generation.errors import CitationValidationError, GroundedGenerationError, StructuredOutputError
from src.ai_assistant.generation.generator import GroundedGenerator, GroundedRAGAssistant
from src.ai_assistant.generation.prompts import GROUNDED_RESULT_SCHEMA, grounded_system_prompt, grounded_user_prompt
from src.ai_assistant.evaluation.evaluate_citation_canonicalization_paired import _evaluate_pair
from src.ai_assistant.llm.models import LLMResponse
from src.ai_assistant.models import ContextPack, ExpandedEvidence


def _pack(query: str = "ما هي الشروط؟") -> ContextPack:
    evidence = ExpandedEvidence("E1", ["chunk-1"], "chunk-1", "parent-1", "doc-1", "Policy", "source", "source", 1, 2.0,
                                1, 2, 0.1, 4, 5, "3", "a", "chunk_only", {})
    citation_map = {"E1": {"chunk_ids": ["chunk-1"], "parent_id": "parent-1", "document_id": "doc-1", "document_title": "Policy",
                           "page_start": 4, "page_end": 5, "article_number": "3", "provision_number": "a"}}
    return ContextPack(query, [evidence], ["chunk-1"], ["parent-1"], ["doc-1"], citation_map, 1, 1, 1, 10, {})


def _mapped_pack(citation_map):
    return ContextPack("Question", [], [chunk for source in citation_map.values() for chunk in source["chunk_ids"]], [], [], citation_map,
                       len(citation_map), len(citation_map), len(citation_map), 10, {})


class FakeProvider:
    def __init__(self, contents: list[str]) -> None:
        self.contents = list(contents)
        self.requests = []

    def generate(self, request):
        self.requests.append(request)
        return LLMResponse(self.contents.pop(0), "fake", "fake-model", 0.1, 3, 2, 5, "stop")


class FakeBuilder:
    def __init__(self, pack):
        self.pack, self.calls = pack, []

    def build(self, query):
        self.calls.append(query)
        return self.pack


def _valid(answer="إجابة [E1]", citations=None, no_answer=False):
    import json
    return json.dumps({"answer": answer, "citations": ["E1"] if citations is None else citations, "no_answer": no_answer}, ensure_ascii=False)


def test_prompt_is_grounded_and_contains_only_question_and_evidence():
    system, user = grounded_system_prompt(GenerationConfig()), grounded_user_prompt(_pack("English question"))
    assert "ONLY the supplied evidence" in system and "RESPONSE LANGUAGE: English" in user and "QUESTION:\nEnglish question" in user and "[EVIDENCE E1]" in user
    assert "Dense" not in user and "BM25" not in user and "RRF" not in user and "reranker" not in user
    assert GROUNDED_RESULT_SCHEMA["additionalProperties"] is False


def test_llm_facing_context_keeps_handles_and_human_provenance_but_hides_internal_ids():
    pack = _pack("English question")
    rendered = pack.render_for_llm()
    assert "[EVIDENCE E1]" in rendered and "Document: Policy" in rendered and "Page: 4-5" in rendered
    assert "Article / Provision: 3 / a" in rendered and "Text:\nsource" in rendered
    assert "chunk-1" not in rendered and "parent-1" not in rendered and "doc-1" not in rendered
    assert pack.citation_map["E1"]["chunk_ids"] == ["chunk-1"] and pack.evidence_items[0].expanded_text == "source"


def test_arabic_prompt_requests_arabic_response():
    assert "RESPONSE LANGUAGE: Arabic" in grounded_user_prompt(_pack())


@pytest.mark.parametrize("text", ["not json", "{}", '{"answer":"","citations":[],"no_answer":false}', '{"answer":"x","citations":"E1","no_answer":false}'])
def test_malformed_or_empty_structured_output_rejected(text):
    with pytest.raises(StructuredOutputError):
        parse_grounded_result(text)


def test_citation_rules_deduplicate_and_preserve_order():
    result = parse_grounded_result(_valid(citations=["E1", "E1"]))
    assert result.citations == ["E1"]
    assert validate_citations(result, _pack())[0].document_id == "doc-1"
    with pytest.raises(CitationValidationError):
        validate_citations(parse_grounded_result(_valid(citations=["E99"])), _pack())
    with pytest.raises(CitationValidationError):
        validate_citations(parse_grounded_result(_valid(citations=[])), _pack())


def test_exact_chunk_citation_canonicalization_preserves_order_content_and_provenance():
    sources = {
        "E1": {"chunk_ids": ["DOC_CH_001"], "parent_id": "parent-1", "document_id": "doc-1", "document_title": "One", "page_start": 1, "page_end": 1, "article_number": None, "provision_number": None},
        "E2": {"chunk_ids": ["DOC_CH_002", "DOC_CH_003"], "parent_id": "parent-2", "document_id": "doc-2", "document_title": "Two", "page_start": 2, "page_end": 2, "article_number": None, "provision_number": None},
    }
    original = parse_grounded_result(_valid("facts remain byte-for-byte", ["E2", "DOC_CH_001", "DOC_CH_003", "DOC_CH_001"]))
    normalized, count = canonicalize_citations(original, _mapped_pack(sources))
    assert normalized.answer == original.answer and normalized.no_answer is original.no_answer
    assert normalized.citations == ["E2", "E1"] and count == 2
    assert [source.handle for source in validate_citations(normalized, _mapped_pack(sources))] == ["E2", "E1"]


def test_raw_first_pass_capture_preserves_the_pre_parser_payload():
    raw = '{"answer":" exact answer ","citations":["chunk-1","chunk-1"],"no_answer":false}'
    captured = raw_first_pass_payload(raw)
    assert captured == {"answer": " exact answer ", "citations": ["chunk-1", "chunk-1"], "no_answer": False}
    parsed = parse_grounded_result(raw)
    assert parsed.answer == "exact answer" and parsed.citations == ["chunk-1"]


def test_paired_evaluator_feeds_the_same_first_pass_payload_to_both_branches():
    original = parse_grounded_result(_valid("fact", ["chunk-1"]))
    record = _evaluate_pair(original, _pack())
    expected = {"answer": "fact", "citations": ["chunk-1"], "no_answer": False}
    assert record["branch_a_input"] == record["branch_b_input"] == expected
    assert record["same_raw_payload_for_both_branches"]
    assert record["answer_unchanged"] and record["no_answer_unchanged"]
    assert record["current"]["repair_required"] and not record["canonicalized"]["repair_required"]


def test_canonicalization_rejects_unknown_outside_ambiguous_and_substring_ids_and_keeps_no_answer_contract():
    sources = {
        "E1": {"chunk_ids": ["DOC_CH_001", "shared"], "parent_id": "p1", "document_id": "d1", "document_title": None, "page_start": None, "page_end": None, "article_number": None, "provision_number": None},
        "E2": {"chunk_ids": ["shared"], "parent_id": "p2", "document_id": "d2", "document_title": None, "page_start": None, "page_end": None, "article_number": None, "provision_number": None},
    }
    pack = _mapped_pack(sources)
    for bad in ("unknown", "DOC_CH_001_suffix", "shared"):
        normalized, count = canonicalize_citations(parse_grounded_result(_valid("fact", [bad])), pack)
        assert normalized.citations == [bad] and count == 0
        with pytest.raises(CitationValidationError):
            validate_citations(normalized, pack)
    abstention = parse_grounded_result(_valid("abstain", ["DOC_CH_001"], no_answer=True))
    normalized, count = canonicalize_citations(abstention, pack)
    assert normalized == abstention and count == 0
    with pytest.raises(CitationValidationError):
        validate_citations(normalized, pack)


def test_decorated_e_handles_normalize_only_when_the_full_wrapper_and_current_handle_are_valid():
    pack = _pack()
    for wrapper in ("EVIDENCE E1", "[E1]", "[EVIDENCE E1]"):
        normalized, count = canonicalize_citations(parse_grounded_result(_valid("fact", [wrapper])), pack)
        assert normalized.citations == ["E1"] and count == 1
    for invalid in ("prefix E1", "E1 suffix", "[E999]", "EVIDENCE E1 more", "[EVIDENCE E1] more"):
        normalized, count = canonicalize_citations(parse_grounded_result(_valid("fact", [invalid])), pack)
        assert normalized.citations == [invalid] and count == 0
        with pytest.raises(CitationValidationError):
            validate_citations(normalized, pack)


def test_generator_normalizes_exact_chunk_ids_before_one_shot_repair():
    provider = FakeProvider([_valid("fact", ["chunk-1"])])
    response = GroundedGenerator(provider, citation_canonicalization=True).generate(_pack())
    assert response.answer == "fact" and response.citations == ["E1"]
    assert response.citation_normalization_used and response.citation_normalization_count == 1
    assert not response.citation_repair_attempted and len(provider.requests) == 1


def test_default_pipeline_enables_canonicalization_and_avoids_repair():
    provider = FakeProvider([_valid("fact", ["chunk-1"])])
    response = GroundedGenerator(provider).generate(_pack())
    assert response.citations == ["E1"] and not response.citation_repair_attempted
    assert response.citation_normalization_used and len(provider.requests) == 1


def test_explicit_diagnostic_disabling_preserves_the_repair_fallback():
    provider = FakeProvider([_valid("fact", ["chunk-1"]), _valid("fact", ["E1"])])
    response = GroundedGenerator(provider, citation_canonicalization=False).generate(_pack())
    assert response.citations == ["E1"] and response.citation_repair_attempted
    assert not response.citation_normalization_used and len(provider.requests) == 2


def test_no_answer_contract_and_provenance_resolution():
    abstention = parse_grounded_result(_valid(answer="المصادر المتاحة غير كافية.", citations=[], no_answer=True))
    assert validate_citations(abstention, _pack()) == []
    with pytest.raises(CitationValidationError):
        validate_citations(parse_grounded_result(_valid(citations=["E1"], no_answer=True)), _pack())
    source = validate_citations(parse_grounded_result(_valid()), _pack())[0]
    assert source.chunk_ids == ["chunk-1"] and (source.document_id, source.page_start, source.article_number) == ("doc-1", 4, "3")


def test_empty_explicit_abstention_receives_a_safe_localized_message():
    response = GroundedGenerator(FakeProvider([_valid(answer="", citations=[], no_answer=True)])).generate(_pack())
    assert response.no_answer and response.answer.startswith("المصادر المتاحة")


def test_generator_preserves_arabic_english_identity_usage_and_schema_request():
    provider = FakeProvider([_valid()])
    response = GroundedGenerator(provider).generate(_pack())
    assert response.original_query == "ما هي الشروط؟" and response.provider == "fake" and response.model == "fake-model"
    assert (response.input_tokens, response.output_tokens, response.total_tokens) == (3, 2, 5)
    assert provider.requests[0].response_schema == GROUNDED_RESULT_SCHEMA
    english = GroundedGenerator(FakeProvider([_valid("Supported [E1]")])).generate(_pack("What is required?"))
    assert english.original_query == "What is required?"


def test_citation_repair_is_exactly_once_and_must_not_change_facts():
    provider = FakeProvider([_valid("fact", ["E99"]), _valid("fact", ["E1"])])
    response = GroundedGenerator(provider).generate(_pack())
    assert response.citation_repair_attempted and response.citations == ["E1"] and len(provider.requests) == 2
    altered = FakeProvider([_valid("fact", ["E99"]), _valid("changed", ["E1"])])
    with pytest.raises(GroundedGenerationError, match="alter answer facts"):
        altered_generator = GroundedGenerator(altered)
        altered_generator.generate(_pack())
    assert altered_generator.last_trace["citation_safety_stop"]
    failed = FakeProvider([_valid("fact", ["E99"]), _valid("fact", ["E98"])])
    with pytest.raises(GroundedGenerationError, match="repair failed"):
        GroundedGenerator(failed).generate(_pack())
    assert len(failed.requests) == 2


def test_orchestrator_uses_context_builder_and_provider_abstraction(monkeypatch):
    pack, builder, provider = _pack(), FakeBuilder(_pack()), FakeProvider([_valid()])
    answer = GroundedRAGAssistant(context_builder=builder, provider=provider).answer(pack.original_query)
    assert builder.calls == [pack.original_query] and answer.citations == ["E1"]
    factory_provider = FakeProvider([_valid()])
    monkeypatch.setattr("src.ai_assistant.generation.generator.get_llm", lambda: factory_provider)
    assert GroundedRAGAssistant(context_builder=FakeBuilder(pack)).answer(pack.original_query).provider == "fake"


def test_generation_config_has_no_runtime_provider_or_credentials_and_no_sdk_import():
    config = load_generation_config()
    assert set(config.to_dict()).isdisjoint({"provider", "model", "api_key", "temperature", "reasoning_effort"})
    import src.ai_assistant.generation.generator as module
    assert "import groq" not in inspect.getsource(module)
