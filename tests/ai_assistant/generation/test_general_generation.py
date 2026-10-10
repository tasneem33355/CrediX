from __future__ import annotations

import json

import pytest

from src.ai_assistant.generation.errors import GeneralGenerationError
from src.ai_assistant.generation.general import (
    GENERAL_RESULT_SCHEMA,
    GeneralAssistant,
    GeneralGenerator,
    general_system_prompt,
    general_user_prompt,
)
from src.ai_assistant.llm.models import LLMResponse


class FakeProvider:
    def __init__(self, text: str) -> None:
        self.text = text
        self.requests = []

    def generate(self, request):
        self.requests.append(request)
        return LLMResponse(self.text, "fake", "fake-model", 0.01, 2, 3, 5, "stop")


def test_general_prompt_is_explicitly_non_grounded_and_schema_has_no_citations():
    assert "general model knowledge only" in general_system_prompt()
    assert "retrieved evidence" in general_system_prompt()
    assert "RESPONSE LANGUAGE: English" in general_user_prompt("Explain credit risk")
    assert "RESPONSE LANGUAGE: Arabic" in general_user_prompt("اشرح مخاطر الائتمان")
    assert "citations" not in GENERAL_RESULT_SCHEMA["properties"]


def test_general_generator_returns_machine_readable_ai_provenance_and_no_citations():
    provider = FakeProvider(json.dumps({"answer": "A general explanation."}))
    result = GeneralGenerator(provider).generate("Explain credit risk")

    assert result.answer == "A general explanation."
    assert result.answer_mode == "general"
    assert result.provenance == "ai_generated"
    assert result.citations == []
    assert "AI-generated" in result.disclaimer
    assert result.to_dict()["answer_mode"] == "general"
    assert provider.requests[0].response_schema == GENERAL_RESULT_SCHEMA
    assert provider.requests[0].response_schema_name == "general_answer"


def test_general_arabic_answer_uses_arabic_disclaimer():
    result = GeneralGenerator(FakeProvider(json.dumps({"answer": "شرح عام."}))).generate("اشرح معنى المخاطر")
    assert result.disclaimer.startswith("إجابة مولّدة")


@pytest.mark.parametrize("text", ["not json", "{}", json.dumps({"answer": ""}), json.dumps({"answer": "x", "citations": []})])
def test_general_generator_rejects_non_contract_output(text):
    with pytest.raises(GeneralGenerationError):
        GeneralGenerator(FakeProvider(text)).generate("Explain")


def test_general_assistant_uses_injected_generator_without_retrieval():
    class StubGenerator:
        def __init__(self):
            self.calls = []

        def generate(self, query):
            self.calls.append(query)
            return "general-result"

    generator = StubGenerator()
    assistant = GeneralAssistant(generator=generator)
    assert assistant.answer("Question") == "general-result"
    assert generator.calls == ["Question"]

