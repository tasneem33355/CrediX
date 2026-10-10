from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest
import groq

from src.ai_assistant.llm.config import LLMSettings
from src.ai_assistant.llm.errors import LLMAuthenticationError, LLMConfigurationError, LLMRateLimitError, LLMResponseError, LLMTimeoutError
from src.ai_assistant.llm.factory import get_llm
from src.ai_assistant.llm.groq_provider import GroqProvider
from src.ai_assistant.llm.models import LLMRequest


def _settings(**overrides) -> LLMSettings:
    values = {"provider": "groq", "model": "openai/gpt-oss-120b", **overrides}
    return LLMSettings(**values)


class FakeCompletions:
    def __init__(self, outcomes):
        self.outcomes, self.calls = list(outcomes), []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        value = self.outcomes.pop(0)
        if isinstance(value, Exception):
            raise value
        return value


def _client(*outcomes):
    completions = FakeCompletions(outcomes)
    return SimpleNamespace(chat=SimpleNamespace(completions=completions)), completions


def _completion(text="GROQ_OK"):
    return SimpleNamespace(model="openai/gpt-oss-120b", choices=[SimpleNamespace(message=SimpleNamespace(content=text), finish_reason="stop")],
                           usage=SimpleNamespace(prompt_tokens=3, completion_tokens=2, total_tokens=5))


def _status_error(kind, status=429):
    request = httpx.Request("POST", "https://api.groq.com")
    return kind("safe", response=httpx.Response(status, request=request), body={})


def test_environment_settings_and_safe_diagnostics(monkeypatch, tmp_path):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv("GROQ_API_KEY", "secret-value")
    settings = LLMSettings.from_env(dotenv_path=tmp_path / "missing.env")
    assert settings.provider == "groq" and settings.model == "openai/gpt-oss-120b"
    assert settings.diagnostics()["credential_configured"] is True
    assert "secret-value" not in repr(settings) and "secret-value" not in repr(settings.diagnostics())


@pytest.mark.parametrize("env,value", [("LLM_PROVIDER", ""), ("LLM_MODEL", ""), ("LLM_TEMPERATURE", "-1"),
                                         ("LLM_MAX_OUTPUT_TOKENS", "0"), ("LLM_TIMEOUT_SECONDS", "0"), ("LLM_MAX_RETRIES", "-1")])
def test_invalid_environment_settings_rejected(monkeypatch, tmp_path, env, value):
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-oss-120b")
    monkeypatch.setenv(env, value)
    with pytest.raises(LLMConfigurationError):
        LLMSettings.from_env(dotenv_path=tmp_path / "missing.env")


def test_optional_environment_values_may_be_absent(monkeypatch, tmp_path):
    for name in ("LLM_TEMPERATURE", "LLM_MAX_OUTPUT_TOKENS", "LLM_TIMEOUT_SECONDS", "LLM_MAX_RETRIES", "LLM_REASONING_EFFORT"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-oss-120b")
    settings = LLMSettings.from_env(dotenv_path=tmp_path / "missing.env")
    assert settings.temperature is None and settings.reasoning_effort is None
    assert (settings.max_output_tokens, settings.timeout_seconds, settings.max_retries) == (1000, 45.0, 2)


def test_factory_returns_groq_provider_and_unsupported_provider_fails(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "safe-test-key")
    assert isinstance(get_llm(_settings()), GroqProvider)
    with pytest.raises(LLMConfigurationError):
        get_llm(LLMSettings(provider="openai", model="x"))


def test_groq_client_is_initialized_once_and_key_is_required(monkeypatch):
    calls = []
    monkeypatch.setattr("src.ai_assistant.llm.groq_provider.groq.Groq", lambda **kwargs: calls.append(kwargs) or _client(_completion())[0])
    provider = GroqProvider(_settings(), api_key="safe-test-key")
    assert len(calls) == 1
    with pytest.raises(LLMAuthenticationError, match="GROQ_API_KEY"):
        GroqProvider(_settings(), api_key="")


def test_configured_model_payload_response_usage_latency_and_model_switch():
    client, calls = _client(_completion(), _completion())
    provider = GroqProvider(_settings(), client=client, api_key="safe")
    response = provider.generate(LLMRequest("system", "user"))
    assert calls.calls[0]["model"] == "openai/gpt-oss-120b"
    assert response.text == "GROQ_OK" and response.input_tokens == 3 and response.total_tokens == 5 and response.latency_seconds >= 0
    alternate_client, alternate_calls = _client(_completion())
    GroqProvider(_settings(model="openai/gpt-oss-20b"), client=alternate_client, api_key="safe").generate(LLMRequest("s", "u"))
    assert alternate_calls.calls[0]["model"] == "openai/gpt-oss-20b"


def test_optional_temperature_and_reasoning_are_forwarded_only_when_configured():
    client, calls = _client(_completion())
    GroqProvider(_settings(), client=client, api_key="safe").generate(LLMRequest("s", "u"))
    assert "temperature" not in calls.calls[0] and "reasoning_effort" not in calls.calls[0]
    configured_client, configured_calls = _client(_completion())
    GroqProvider(_settings(temperature=0.2, reasoning_effort="low"), client=configured_client, api_key="safe").generate(LLMRequest("s", "u"))
    assert configured_calls.calls[0]["temperature"] == 0.2
    assert configured_calls.calls[0]["reasoning_effort"] == "low"


def test_structured_json_schema_request_and_malformed_response():
    client, calls = _client(_completion())
    provider = GroqProvider(_settings(), client=client, api_key="safe")
    provider.generate(LLMRequest("s", "u", response_schema={"type": "object", "properties": {"status": {"type": "string"}}, "required": ["status"], "additionalProperties": False}, response_schema_name="smoke"))
    assert calls.calls[0]["response_format"]["json_schema"]["strict"] is True
    bad_client, _ = _client(SimpleNamespace(choices=[]))
    with pytest.raises(LLMResponseError):
        GroqProvider(_settings(), client=bad_client, api_key="safe").generate(LLMRequest("s", "u"))


def test_timeout_auth_rate_limit_mapping_and_bounded_retry():
    timeout_client, _ = _client(groq.APITimeoutError(httpx.Request("POST", "https://api.groq.com")))
    with pytest.raises(LLMTimeoutError):
        GroqProvider(_settings(max_retries=0), client=timeout_client, api_key="safe").generate(LLMRequest("s", "u"))
    auth_client, auth_calls = _client(_status_error(groq.AuthenticationError, 401), _completion())
    with pytest.raises(LLMAuthenticationError):
        GroqProvider(_settings(max_retries=2), client=auth_client, api_key="safe").generate(LLMRequest("s", "u"))
    assert len(auth_calls.calls) == 1
    retry_client, retry_calls = _client(_status_error(groq.RateLimitError), _completion())
    response = GroqProvider(_settings(max_retries=1), client=retry_client, api_key="safe").generate(LLMRequest("s", "u"))
    assert response.text == "GROQ_OK" and len(retry_calls.calls) == 2
    exhausted_client, _ = _client(_status_error(groq.RateLimitError), _status_error(groq.RateLimitError))
    with pytest.raises(LLMRateLimitError):
        GroqProvider(_settings(max_retries=1), client=exhausted_client, api_key="safe").generate(LLMRequest("s", "u"))


def test_explicit_injection_and_reasoning_validation():
    client, _ = _client(_completion())
    assert GroqProvider(_settings(), client=client, api_key="safe").settings is not None
    with pytest.raises(LLMConfigurationError, match="reasoning effort"):
        GroqProvider(_settings(reasoning_effort="xhigh"), client=client, api_key="safe").generate(LLMRequest("s", "u"))
