from unittest.mock import MagicMock

import httpx
import pytest
from google.genai.errors import ClientError
from groq import RateLimitError

from pipeline.agent.llm_client import (
    GEMINI_MAX_RETRIES,
    LLMClient,
    LLMProviderError,
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
    assert gemini_client.models.generate_content.call_count == GEMINI_MAX_RETRIES
    groq_client.chat.completions.create.assert_called_once()


def test_chat_with_tools_retries_gemini_before_fallback(monkeypatch):
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = [
        _gemini_rate_limit_error(),
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
