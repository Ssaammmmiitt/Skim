from unittest.mock import MagicMock

import httpx
import pytest
from google.genai.errors import ClientError, ServerError
from groq import RateLimitError

from pipeline.agent.llm_client import (
    GEMINI_FALLBACK_MODEL,
    GEMINI_FALLBACK_MODELS,
    GEMINI_MAX_RETRIES,
    GEMINI_MODEL,
    HIGH_DEMAND_SWITCH_THRESHOLD,
    MODEL_RECOVERY_COOLDOWN_SECONDS,
    LLMClient,
    LLMProviderError,
    _GeminiKeyPool,
    _GeminiModelRouter,
    _load_fallback_models,
    _model_router,
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


ALL_5_KEYS = "k1,k2,k3,k4,k5"


@pytest.fixture(autouse=True)
def _reset_gemini_model_router():
    _model_router.reset()
    yield
    _model_router.reset()


# ── _parse_csv_keys ──────────────────────────────────────────────────────


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


# ── _GeminiKeyPool ────────────────────────────────────────────────────────


def test_key_pool_round_robins():
    pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
    pool._lock = __import__("threading").Lock()
    pool.all_exhausted = False

    from pipeline.agent.llm_client import _GeminiKeySlot

    slots = []
    for i in range(3):
        s = _GeminiKeySlot.__new__(_GeminiKeySlot)
        s.index = i
        s.total = 3
        s.calls = 0
        s.exhausted = False
        s._lock = __import__("threading").Lock()
        slots.append(s)
    pool._slots = slots
    pool._cursor = 0

    indices = [pool.next_slot().index for _ in range(6)]
    assert indices == [0, 1, 2, 0, 1, 2]


def test_key_pool_skips_exhausted():
    pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
    pool._lock = __import__("threading").Lock()
    pool.all_exhausted = False

    from pipeline.agent.llm_client import _GeminiKeySlot

    slots = []
    for i in range(3):
        s = _GeminiKeySlot.__new__(_GeminiKeySlot)
        s.index = i
        s.total = 3
        s.calls = 0
        s.exhausted = i == 1
        s._lock = __import__("threading").Lock()
        slots.append(s)
    pool._slots = slots
    pool._cursor = 0

    indices = [pool.next_slot().index for _ in range(4)]
    assert indices == [0, 2, 0, 2]


def test_key_pool_all_exhausted_returns_none():
    pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
    pool._lock = __import__("threading").Lock()
    pool.all_exhausted = False

    from pipeline.agent.llm_client import _GeminiKeySlot

    slots = []
    for i in range(2):
        s = _GeminiKeySlot.__new__(_GeminiKeySlot)
        s.index = i
        s.total = 2
        s.calls = 0
        s.exhausted = True
        s._lock = __import__("threading").Lock()
        slots.append(s)
    pool._slots = slots
    pool._cursor = 0

    assert pool.next_slot() is None
    assert pool.all_exhausted


# ── Injected-client path ─────────────────────────────────────────────────


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
    assert gemini_client.models.generate_content.call_count == GEMINI_MAX_RETRIES * (
        1 + len(GEMINI_FALLBACK_MODELS)
    )


# ── Key-pool rotation (replaces old _advance_gemini_key tests) ───────────


def _make_pool_client(monkeypatch, keys: str, failing_indices: set[int]) -> LLMClient:
    """Create LLMClient with a key pool where specified indices fail with 429."""
    monkeypatch.setenv("GEMINI_API_KEYS", keys)
    key_list = [k.strip() for k in keys.split(",")]

    def _factory(api_key: str):
        idx = key_list.index(api_key)
        client = MagicMock()
        if idx in failing_indices:
            client.models.generate_content.side_effect = _gemini_rate_limit_error()
        else:
            client.models.generate_content.return_value = _gemini_tool_response(
                {
                    "article_id": 1,
                    "topic": "ai_ml",
                    "importance_score": 8,
                    "reasoning": "ok",
                }
            )
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    return LLMClient()


def test_gemini_5_keys_first_succeeds(monkeypatch):
    client = _make_pool_client(monkeypatch, ALL_5_KEYS, failing_indices=set())
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert result["provider"] == "gemini"
    assert not client._gemini_exhausted


def test_gemini_5_keys_rotates_through_first_four_exhausted(monkeypatch):
    client = _make_pool_client(monkeypatch, ALL_5_KEYS, failing_indices={0, 1, 2, 3})
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert result["provider"] == "gemini"
    assert not client._gemini_exhausted


def test_gemini_5_keys_all_exhausted_falls_to_groq(monkeypatch):
    client = _make_pool_client(monkeypatch, ALL_5_KEYS, failing_indices={0, 1, 2, 3, 4})
    groq = MagicMock()
    groq.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )
    client._groq = groq
    client._groq_is_injected = True
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert result["provider"] == "groq"
    assert client._gemini_exhausted


def test_gemini_exhausted_flag_skips_gemini_on_subsequent_calls(monkeypatch):
    client = _make_pool_client(monkeypatch, "k1,k2", failing_indices={0, 1})
    groq = MagicMock()
    groq.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )
    client._groq = groq
    client._groq_is_injected = True

    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert client._gemini_exhausted

    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert groq.chat.completions.create.call_count == 3


def test_gemini_429_then_404_rotates_to_working_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "key-a,key-b,key-c")

    def _factory(api_key: str):
        client = MagicMock()
        if api_key == "key-a":
            client.models.generate_content.side_effect = _gemini_rate_limit_error()
        elif api_key == "key-b":
            client.models.generate_content.side_effect = _gemini_not_found_error()
        else:
            client.models.generate_content.return_value = _gemini_tool_response(
                {
                    "article_id": 1,
                    "topic": "ai_ml",
                    "importance_score": 8,
                    "reasoning": "ok",
                }
            )
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    client = LLMClient()
    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    assert result["provider"] == "gemini"


def test_gemini_404_all_keys_falls_to_groq(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "key-a,key-b")

    def _factory(api_key: str):
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


# ── Groq rotation ────────────────────────────────────────────────────────


def _make_groq_clients(
    monkeypatch, keys: str, failing_count: int
) -> tuple[list[str], MagicMock]:
    monkeypatch.setenv("GROQ_API_KEYS", keys)
    constructed: list[str] = []
    working = MagicMock()
    working.chat.completions.create.return_value = _groq_tool_response(
        {"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"}
    )

    def _factory(api_key: str, **_kwargs):
        constructed.append(api_key)
        if len(constructed) <= failing_count:
            failing = MagicMock()
            failing.chat.completions.create.side_effect = _groq_rate_limit_error()
            return failing
        return working

    monkeypatch.setattr("pipeline.agent.llm_client.Groq", _factory)
    return constructed, working


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

    def _factory(api_key: str, **_kwargs):
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
    monkeypatch.setenv("GROQ_API_KEYS", "q1,q2")
    client = _make_pool_client(monkeypatch, ALL_5_KEYS, failing_indices={0, 1, 2, 3, 4})
    constructed_groq: list[str] = []

    def _groq_factory(api_key: str, **_kwargs):
        constructed_groq.append(api_key)
        c = MagicMock()
        c.chat.completions.create.side_effect = _groq_rate_limit_error()
        return c

    monkeypatch.setattr("pipeline.agent.llm_client.Groq", _groq_factory)
    client._groq = None
    client._groq_is_injected = False
    client._groq_keys = ["q1", "q2"]
    client._groq_keys_index = 0

    with pytest.raises(LLMProviderError, match="Both Gemini and Groq failed"):
        client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert constructed_groq == ["q1", "q2"]


def test_full_rotation_5_gemini_exhausted_2nd_groq_works(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "q1,q2")
    client = _make_pool_client(monkeypatch, ALL_5_KEYS, failing_indices={0, 1, 2, 3, 4})
    constructed_groq, _ = _make_groq_clients(monkeypatch, "q1,q2", failing_count=1)
    client._groq = None
    client._groq_is_injected = False
    client._groq_keys = ["q1", "q2"]
    client._groq_keys_index = 0

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "groq"
    assert constructed_groq == ["q1", "q2"]


# ── Usage tracking ───────────────────────────────────────────────────────


def test_usage_summary_tracks_calls(monkeypatch):
    client = _make_pool_client(monkeypatch, "k1,k2", failing_indices=set())
    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])
    client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    calls = client._gemini_calls_per_key
    total = sum(calls.values())
    assert total == 2
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


# ── Message normalization ────────────────────────────────────────────────


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


# ── Gemini model router ──────────────────────────────────────────────────


def test_load_fallback_models_from_plural_env(monkeypatch):
    monkeypatch.setenv(
        "GEMINI_FALLBACK_MODELS", "gemini-2.0-flash,gemini-3.5-flash-lite"
    )
    monkeypatch.delenv("GEMINI_FALLBACK_MODEL", raising=False)
    assert _load_fallback_models() == ["gemini-2.0-flash", "gemini-3.5-flash-lite"]


def test_load_fallback_models_from_singular_env(monkeypatch):
    monkeypatch.delenv("GEMINI_FALLBACK_MODELS", raising=False)
    monkeypatch.setenv("GEMINI_FALLBACK_MODEL", "gemini-2.0-flash")
    assert _load_fallback_models() == ["gemini-2.0-flash"]


def test_model_router_switches_to_fallback_after_threshold():
    router = _GeminiModelRouter()
    for _ in range(HIGH_DEMAND_SWITCH_THRESHOLD):
        router.record_high_demand_failure()
    assert router.using_fallback
    assert router.models_for_request() == GEMINI_FALLBACK_MODELS


def test_model_router_recovers_primary_after_cooldown(monkeypatch):
    router = _GeminiModelRouter()
    for _ in range(HIGH_DEMAND_SWITCH_THRESHOLD):
        router.record_high_demand_failure()

    monkeypatch.setattr(
        "pipeline.agent.llm_client.time.time",
        lambda: 1000.0 + MODEL_RECOVERY_COOLDOWN_SECONDS,
    )
    router._fallback_since = 1000.0

    assert router.models_for_request() == [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]


def test_model_router_success_on_primary_clears_fallback():
    router = _GeminiModelRouter()
    for _ in range(HIGH_DEMAND_SWITCH_THRESHOLD):
        router.record_high_demand_failure()

    router.record_success(GEMINI_MODEL)

    assert not router.using_fallback
    assert router.models_for_request() == [GEMINI_MODEL]


def test_chat_with_tools_switches_gemini_model_on_high_demand(monkeypatch):
    gemini_client = MagicMock()
    gemini_client.models.generate_content.side_effect = [
        _gemini_server_error() for _ in range(GEMINI_MAX_RETRIES)
    ] + [
        _gemini_tool_response(
            {
                "article_id": 1,
                "topic": "ai_ml",
                "importance_score": 8,
                "reasoning": "Fallback model worked",
            }
        )
    ]
    monkeypatch.setattr("pipeline.agent.llm_client.time.sleep", lambda seconds: None)
    client = LLMClient(gemini_client=gemini_client, groq_client=MagicMock())

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert _model_router.using_fallback
    models_used = [
        call.kwargs.get("model") or call.args[0]
        for call in gemini_client.models.generate_content.call_args_list
    ]
    assert models_used[:GEMINI_MAX_RETRIES] == [GEMINI_MODEL] * GEMINI_MAX_RETRIES
    assert models_used[-1] == GEMINI_FALLBACK_MODEL


def test_pool_503_rotates_key_without_exhausting(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")

    def _factory(api_key: str):
        client = MagicMock()
        if api_key == "k1":
            client.models.generate_content.side_effect = _gemini_server_error()
        else:
            client.models.generate_content.return_value = _gemini_tool_response(
                {
                    "article_id": 1,
                    "topic": "ai_ml",
                    "importance_score": 8,
                    "reasoning": "ok",
                }
            )
        return client

    monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
    monkeypatch.setattr("pipeline.agent.llm_client.time.sleep", lambda seconds: None)
    client = LLMClient()

    result = client.chat_with_tools(SAMPLE_MESSAGES, [SAMPLE_TOOL])

    assert result["provider"] == "gemini"
    assert not client._pool.slots[0].exhausted
    assert client._pool.slots[1].calls == 1
