from unittest.mock import MagicMock

import httpx
import pytest
from google.genai.errors import ClientError, ServerError
from groq import RateLimitError

from pipeline.agent.llm_client import (
    GEMINI_MAX_RETRIES,
    LLMClient,
    LLMProviderError,
    _parse_csv_keys,
)
from pipeline.agent.prompts import build_classification_messages
from pipeline.agent.tools import CLASSIFY_ARTICLE

SAMPLE_TOOL = CLASSIFY_ARTICLE

SAMPLE_MESSAGES = [
    {
        "role": "system",
        "content": "You classify tech news articles.",
    },
    {
        "role": "user",
        "content": "Classify article 1: OpenAI releases a new GPT model.",
    },
]


def _gemini_rate_limit_error() -> ClientError:
    return ClientError(429, {"error": {"message": "rate limit exceeded"}}, None)


def _gemini_server_error() -> ServerError:
    return ServerError(503, {"error": {"message": "service unavailable"}}, None)


def _gemini_not_found_error() -> ClientError:
    return ClientError(
        404,
        {"error": {"message": "model not available for this project"}},
        None,
    )


def _groq_rate_limit_error() -> RateLimitError:
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    response = httpx.Response(429, request=request)
    return RateLimitError("rate limit exceeded", response=response, body=None)


def _gemini_tool_response(arguments: dict) -> MagicMock:
    part = MagicMock()
    part.text = None
    part.function_call = MagicMock()
    part.function_call.name = "classify_article"
    part.function_call.args = arguments
    response = MagicMock()
    response.candidates = [MagicMock()]
    response.candidates[0].content.parts = [part]
    return response


def _groq_tool_response(arguments: dict) -> MagicMock:
    message = MagicMock()
    message.content = None
    tool_call = MagicMock()
    tool_call.id = "call_123"
    tool_call.function.name = "classify_article"
    tool_call.function.arguments = __import__("json").dumps(arguments)
    message.tool_calls = [tool_call]
    response = MagicMock()
    response.choices = [MagicMock(message=message)]
    return response


def test_chat_with_tools_returns_structured_gemini_response():
    gemini_client = MagicMock()
    gemini_client.models.generate_content.return_value = _gemini_tool_response(
        {
            "article_id": 1,
            "topic": "ai_ml",
            "importance_score": 8,
            "reasoning": "Major model release",
        }
    )
    client = LLMClient(gemini_client=gemini_client, groq_client=MagicMock())

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert result["tool_calls"][0]["name"] == "classify_article"
    assert result["tool_calls"][0]["arguments"]["topic"] == "ai_ml"
    assert client.provider == "gemini"


def test_chat_with_tools_falls_back_to_groq_on_gemini_rate_limit():
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_rate_limit_error()
    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {
            "article_id": 1,
            "topic": "ai_ml",
            "importance_score": 7,
            "reasoning": "Fallback classification",
        }
    )
    client = LLMClient(gemini_client=gemini_client, groq_client=groq_client)

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert result["tool_calls"][0]["name"] == "classify_article"
    assert client.provider == "groq"
    groq_client.chat.completions.create.assert_called_once()


def test_chat_with_tools_does_not_retry_gemini_on_rate_limit(monkeypatch):
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_rate_limit_error()
    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {
            "article_id": 1,
            "topic": "ai_ml",
            "importance_score": 7,
            "reasoning": "Fallback classification",
        }
    )
    sleeps: list[float] = []
    monkeypatch.setattr(
        "pipeline.agent.llm_client.time.sleep", lambda seconds: sleeps.append(seconds)
    )
    client = LLMClient(gemini_client=gemini_client, groq_client=groq_client)

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert gemini_client.models.generate_content.call_count == 1
    assert sleeps == []


def test_chat_with_tools_retries_gemini_on_server_error(monkeypatch):
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = [
        _gemini_server_error(),
        _gemini_tool_response(
            {
                "article_id": 1,
                "topic": "ai_ml",
                "importance_score": 8,
                "reasoning": "Recovered after retry",
            }
        ),
    ]
    sleeps: list[float] = []
    monkeypatch.setattr(
        "pipeline.agent.llm_client.time.sleep", lambda seconds: sleeps.append(seconds)
    )
    client = LLMClient(gemini_client=gemini_client, groq_client=MagicMock())

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert gemini_client.models.generate_content.call_count == 2
    assert sleeps == [2]


def test_chat_with_tools_exhausts_retries_then_falls_back(monkeypatch):
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_server_error()
    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {
            "article_id": 1,
            "topic": "ai_ml",
            "importance_score": 7,
            "reasoning": "Fallback classification",
        }
    )
    monkeypatch.setattr("pipeline.agent.llm_client.time.sleep", lambda seconds: None)
    client = LLMClient(gemini_client=gemini_client, groq_client=groq_client)

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert gemini_client.models.generate_content.call_count == GEMINI_MAX_RETRIES


def test_parse_csv_keys_splits_and_strips(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", " key-a , key-b ,, key-c ")
    assert _parse_csv_keys("GEMINI_API_KEYS") == ["key-a", "key-b", "key-c"]


def test_parse_csv_keys_returns_empty_when_unset(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
    assert _parse_csv_keys("GEMINI_API_KEYS") == []


def test_parse_csv_keys_handles_single_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "gsk_solo")
    assert _parse_csv_keys("GROQ_API_KEYS") == ["gsk_solo"]


def test_missing_gemini_keys_raises_clear_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEYS", raising=False)
    with pytest.raises(LLMProviderError, match="GEMINI_API_KEYS is not set"):
        LLMClient()


def _make_gemini_clients(
    monkeypatch, keys: str, exhausted_count: int
) -> tuple[list[str], MagicMock]:
    """Set up monkeypatched Gemini with N exhausted keys then one working."""
    monkeypatch.setenv("GEMINI_API_KEYS", keys)
    constructed: list[str] = []
    working = MagicMock()
    working.models.generate_content.return_value = _gemini_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 8, "reasoning": "ok"}
    )

    def _factory(api_key: str):
        constructed.append(api_key)
        if len(constructed) <= exhausted_count:
            exhausted = MagicMock()
            exhausted.models.generate_content.side_effect = _gemini_rate_limit_error()
            return exhausted
        return working

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    return constructed, working


def _make_groq_clients(
    monkeypatch, keys: str, failing_count: int
) -> tuple[list[str], MagicMock]:
    """Set up monkeypatched Groq with N failing keys then one working."""
    monkeypatch.setenv("GROQ_API_KEYS", keys)
    constructed: list[str] = []
    working = MagicMock()
    working.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )

    def _factory(api_key: str):
        constructed.append(api_key)
        if len(constructed) <= failing_count:
            failing = MagicMock()
            failing.chat.completions.create.side_effect = _groq_rate_limit_error()
            return failing
        return working

    monkeypatch.setattr("pipeline.agent.llm_client.Groq", _factory)
    return constructed, working


def test_gemini_429_then_404_rotates_to_working_key(monkeypatch):
    """Reproduces CI: key 1 quota exhausted, key 2 invalid, key 3 works."""
    monkeypatch.setenv("GEMINI_API_KEYS", "key-a,key-b,key-c")
    constructed: list[str] = []
    working = MagicMock()
    working.models.generate_content.return_value = _gemini_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 8, "reasoning": "ok"}
    )

    def _factory(api_key: str):
        constructed.append(api_key)
        if api_key == "key-a":
            client = MagicMock()
            client.models.generate_content.side_effect = _gemini_rate_limit_error()
            return client
        if api_key == "key-b":
            client = MagicMock()
            client.models.generate_content.side_effect = _gemini_not_found_error()
            return client
        return working

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    client = LLMClient()
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert constructed == ["key-a", "key-b", "key-c"]
    assert working.models.generate_content.call_count == 1


def test_gemini_404_all_keys_falls_to_groq(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "key-a,key-b")
    constructed_gemini: list[str] = []

    def _factory(api_key: str):
        constructed_gemini.append(api_key)
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_not_found_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )
    client = LLMClient(groq_client=groq_client)
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert constructed_gemini == ["key-a", "key-b"]
    groq_client.chat.completions.create.assert_called_once()


ALL_5_KEYS = "k1,k2,k3,k4,k5"


def test_gemini_5_keys_first_succeeds(monkeypatch):
    constructed, working = _make_gemini_clients(
        monkeypatch, ALL_5_KEYS, exhausted_count=0
    )
    client = LLMClient()
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert constructed == ["k1"]
    assert working.models.generate_content.call_count == 1
    assert not client._gemini_exhausted


def test_gemini_5_keys_rotates_through_first_four_exhausted(monkeypatch):
    constructed, working = _make_gemini_clients(
        monkeypatch, ALL_5_KEYS, exhausted_count=4
    )
    client = LLMClient()
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert constructed == ["k1", "k2", "k3", "k4", "k5"]
    assert working.models.generate_content.call_count == 1
    assert not client._gemini_exhausted


def test_gemini_5_keys_all_exhausted_falls_to_groq(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", ALL_5_KEYS)
    constructed_gemini: list[str] = []

    def _factory(api_key: str):
        constructed_gemini.append(api_key)
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_rate_limit_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )
    client = LLMClient(groq_client=groq_client)
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert constructed_gemini == ["k1", "k2", "k3", "k4", "k5"]
    assert client._gemini_exhausted
    groq_client.chat.completions.create.assert_called_once()


def test_gemini_exhausted_flag_skips_gemini_on_subsequent_calls(monkeypatch):
    """Once all keys fail, later calls go straight to Groq — no wasted Gemini hits."""
    monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")
    constructed_gemini: list[str] = []

    def _factory(api_key: str):
        constructed_gemini.append(api_key)
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_rate_limit_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

    groq_client = MagicMock()
    groq_client.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )
    client = LLMClient(groq_client=groq_client)

    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert client._gemini_exhausted
    assert constructed_gemini == ["k1", "k2"]

    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert constructed_gemini == ["k1", "k2"]  # no new Gemini clients
    assert groq_client.chat.completions.create.call_count == 3


def test_groq_2_keys_first_fails_second_works(monkeypatch):
    constructed_groq, working = _make_groq_clients(
        monkeypatch, "groq-a,groq-b", failing_count=1
    )
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_rate_limit_error()
    client = LLMClient(gemini_client=gemini_client)

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert constructed_groq == ["groq-a", "groq-b"]


def test_groq_2_keys_both_fail_raises_provider_error(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "groq-a,groq-b")
    constructed_groq: list[str] = []

    def _factory(api_key: str):
        constructed_groq.append(api_key)
        failing = MagicMock()
        failing.chat.completions.create.side_effect = _groq_rate_limit_error()
        return failing

    monkeypatch.setattr("pipeline.agent.llm_client.Groq", _factory)

    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_rate_limit_error()
    client = LLMClient(gemini_client=gemini_client)

    with pytest.raises(LLMProviderError, match="Both Gemini and Groq failed"):
        client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert constructed_groq == ["groq-a", "groq-b"]


def test_full_rotation_5_gemini_2_groq_all_exhausted(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", ALL_5_KEYS)
    monkeypatch.setenv("GROQ_API_KEYS", "q1,q2")
    constructed_gemini: list[str] = []
    constructed_groq: list[str] = []

    def _gemini_factory(api_key: str):
        constructed_gemini.append(api_key)
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_rate_limit_error()
        return client

    def _groq_factory(api_key: str):
        constructed_groq.append(api_key)
        client = MagicMock()
        client.chat.completions.create.side_effect = _groq_rate_limit_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _gemini_factory)
    monkeypatch.setattr("pipeline.agent.llm_client.Groq", _groq_factory)

    client = LLMClient()

    with pytest.raises(LLMProviderError, match="Both Gemini and Groq failed"):
        client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert constructed_gemini == ["k1", "k2", "k3", "k4", "k5"]
    assert constructed_groq == ["q1", "q2"]


def test_full_rotation_5_gemini_exhausted_2nd_groq_works(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", ALL_5_KEYS)
    constructed_gemini: list[str] = []

    def _gemini_factory(api_key: str):
        constructed_gemini.append(api_key)
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_rate_limit_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _gemini_factory)

    constructed_groq, _ = _make_groq_clients(
        monkeypatch, "q1,q2", failing_count=1
    )
    client = LLMClient()

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert constructed_gemini == ["k1", "k2", "k3", "k4", "k5"]
    assert constructed_groq == ["q1", "q2"]


def test_usage_summary_tracks_calls(monkeypatch):
    constructed, _ = _make_gemini_clients(monkeypatch, "k1,k2", exhausted_count=0)
    client = LLMClient()

    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert client._gemini_calls_per_key == {0: 2}
    assert client._groq_calls == 0


def test_missing_groq_keys_raises_when_gemini_exhausted(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "g1")
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)

    def _gemini_factory(api_key: str):
        client = MagicMock()
        client.models.generate_content.side_effect = _gemini_rate_limit_error()
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _gemini_factory)
    client = LLMClient()

    with pytest.raises(LLMProviderError, match="GROQ_API_KEYS is not set"):
        client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])


def test_normalize_messages_for_groq_adds_ids_to_few_shot_tool_calls():
    client = LLMClient(gemini_client=MagicMock(), groq_client=MagicMock())
    messages = build_classification_messages(
        [{"id": 1, "title": "Test", "source": "test", "summary": "Summary"}]
    )

    normalized = client._normalize_messages_for_groq(messages)

    for message in normalized:
        for tool_call in message.get("tool_calls", []):
            assert tool_call.get("id")


def test_chat_with_tools_raises_when_both_providers_fail():
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = _gemini_rate_limit_error()
    groq_client = MagicMock()
    groq_client.chat.completions.create.side_effect = _groq_rate_limit_error()
    client = LLMClient(gemini_client=gemini_client, groq_client=groq_client)

    with pytest.raises(LLMProviderError, match="Both Gemini and Groq failed"):
        client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])


@pytest.mark.integration
def test_chat_with_tools_live_gemini_response():
    client = LLMClient()
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] in {"gemini", "groq"}
    assert result["tool_calls"]
    assert result["tool_calls"][0]["name"] == "classify_article"
    assert "topic" in result["tool_calls"][0]["arguments"]
