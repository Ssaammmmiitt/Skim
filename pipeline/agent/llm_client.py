import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from groq import Groq

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

logger = logging.getLogger(__name__)


def _parse_csv_env(name: str) -> list[str]:
    return [
        part.strip() for part in os.environ.get(name, "").split(",") if part.strip()
    ]


def _load_fallback_models() -> list[str]:
    models = _parse_csv_env("GEMINI_FALLBACK_MODELS")
    if models:
        return models
    single = os.environ.get("GEMINI_FALLBACK_MODEL", "").strip()
    if single:
        return [single]
    return ["gemini-2.0-flash", "gemini-3.5-flash-lite"]


GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_FALLBACK_MODELS = _load_fallback_models()
GEMINI_FALLBACK_MODEL = GEMINI_FALLBACK_MODELS[0]
GROQ_MODEL = "openai/gpt-oss-120b"

GEMINI_FALLBACK_STATUS_CODES = {403, 404, 429, 500, 502, 503, 504}
GEMINI_RETRYABLE_STATUS_CODES = {500, 502, 503, 504}
GEMINI_KEY_ROTATION_STATUS_CODES = {403, 404, 429}
HIGH_DEMAND_STATUS_CODES = {503, 504}
GEMINI_MAX_RETRIES = 3
GEMINI_RETRY_BACKOFF_SECONDS = 2
GEMINI_REQUEST_TIMEOUT_SECONDS = 60
GROQ_REQUEST_TIMEOUT_SECONDS = 30
HIGH_DEMAND_SWITCH_THRESHOLD = int(os.environ.get("GEMINI_HIGH_DEMAND_THRESHOLD", "3"))
MODEL_RECOVERY_COOLDOWN_SECONDS = int(
    os.environ.get("GEMINI_MODEL_RECOVERY_SECONDS", "60")
)


def _append_missing_fallback_models(models: list[str]) -> None:
    for fallback in GEMINI_FALLBACK_MODELS:
        if fallback not in models:
            models.append(fallback)


class _GeminiModelRouter:
    """Switch to fallback Gemini models on sustained 503/504, recover after cooldown."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._using_fallback = False
        self._fallback_since = 0.0
        self._consecutive_high_demand = 0

    def reset(self) -> None:
        with self._lock:
            self._using_fallback = False
            self._fallback_since = 0.0
            self._consecutive_high_demand = 0

    @property
    def using_fallback(self) -> bool:
        with self._lock:
            return self._using_fallback

    def models_for_request(self) -> list[str]:
        """Return model(s) to try for the current request, in order."""
        with self._lock:
            if not self._using_fallback:
                return [GEMINI_MODEL]

            elapsed = time.time() - self._fallback_since
            if elapsed >= MODEL_RECOVERY_COOLDOWN_SECONDS:
                logger.info(
                    "Gemini model recovery: trying primary %s after %ds cooldown",
                    GEMINI_MODEL,
                    MODEL_RECOVERY_COOLDOWN_SECONDS,
                )
                return [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]
            return list(GEMINI_FALLBACK_MODELS)

    def record_high_demand_failure(self) -> None:
        with self._lock:
            self._consecutive_high_demand += 1
            if (
                not self._using_fallback
                and self._consecutive_high_demand >= HIGH_DEMAND_SWITCH_THRESHOLD
            ):
                self._using_fallback = True
                self._fallback_since = time.time()
                logger.warning(
                    "Gemini high demand: switching to fallback models %s "
                    "(%d consecutive 503/504 failures)",
                    ", ".join(GEMINI_FALLBACK_MODELS),
                    self._consecutive_high_demand,
                )

    def record_success(self, model: str) -> None:
        with self._lock:
            self._consecutive_high_demand = 0
            if model == GEMINI_MODEL and self._using_fallback:
                self._using_fallback = False
                logger.info("Gemini primary model %s recovered", GEMINI_MODEL)

    def record_primary_recovery_failure(self) -> None:
        with self._lock:
            self._using_fallback = True
            self._fallback_since = time.time()
            self._consecutive_high_demand = HIGH_DEMAND_SWITCH_THRESHOLD


_model_router = _GeminiModelRouter()


class LLMProviderError(Exception):
    """Raised when both Gemini and Groq fail."""


def _parse_csv_keys(env_var: str) -> list[str]:
    return _parse_csv_env(env_var)


class _GeminiKeySlot:
    """One Gemini API key with its own client and usage counter. Thread-safe."""

    def __init__(self, api_key: str, index: int, total: int):
        self.client = genai.Client(api_key=api_key)
        self.index = index
        self.total = total
        self.calls = 0
        self.exhausted = False
        self._lock = threading.Lock()

    def mark_exhausted(self) -> None:
        with self._lock:
            self.exhausted = True

    def increment_calls(self) -> None:
        with self._lock:
            self.calls += 1

    @property
    def label(self) -> str:
        return f"key {self.index + 1}/{self.total}"


class _GeminiKeyPool:
    """Round-robin pool distributing requests across Gemini keys.

    Thread-safe: concurrent workers can call ``next_slot()`` and each gets a
    different live key. When a key is marked exhausted the pool skips it.
    """

    def __init__(self, keys: list[str]):
        self._slots = [_GeminiKeySlot(k, i, len(keys)) for i, k in enumerate(keys)]
        self._cursor = 0
        self._lock = threading.Lock()
        self.all_exhausted = False

    def next_slot(self) -> _GeminiKeySlot | None:
        with self._lock:
            if self.all_exhausted:
                return None
            n = len(self._slots)
            for _ in range(n):
                slot = self._slots[self._cursor % n]
                self._cursor += 1
                if not slot.exhausted:
                    return slot
            self.all_exhausted = True
            return None

    def mark_exhausted(self, slot: _GeminiKeySlot) -> None:
        slot.mark_exhausted()
        with self._lock:
            if all(s.exhausted for s in self._slots):
                self.all_exhausted = True
                logger.warning("All %d Gemini keys exhausted", len(self._slots))

    @property
    def slots(self) -> list[_GeminiKeySlot]:
        return list(self._slots)


class LLMClient:
    """Gemini-primary LLM client with Groq fallback.

    Supports concurrent use from multiple threads. Gemini keys are distributed
    via a round-robin pool so parallel workers spread load across quota buckets.
    """

    def __init__(
        self,
        gemini_client: genai.Client | None = None,
        groq_client: Groq | None = None,
    ):
        self._gemini_keys = _parse_csv_keys("GEMINI_API_KEYS")
        self._groq_keys = _parse_csv_keys("GROQ_API_KEYS")

        if gemini_client is not None:
            self._pool: _GeminiKeyPool | None = None
            self._injected_gemini = gemini_client
        elif self._gemini_keys:
            self._pool = _GeminiKeyPool(self._gemini_keys)
            self._injected_gemini = None
        else:
            raise LLMProviderError(
                "GEMINI_API_KEYS is not set; provide one or more comma-separated "
                "Gemini API keys"
            )

        self._groq_keys_index = 0
        self._groq_lock = threading.Lock()
        self._groq = groq_client
        self._groq_is_injected = groq_client is not None
        self._groq_calls = 0
        self.provider = "gemini"
        self._model_router = _model_router

        logger.info(
            "LLMClient ready: %d Gemini keys, %d Groq keys, model=%s (fallbacks=%s)",
            len(self._gemini_keys),
            len(self._groq_keys),
            GEMINI_MODEL,
            ", ".join(GEMINI_FALLBACK_MODELS),
        )

    @property
    def _gemini_exhausted(self) -> bool:
        if self._pool is None:
            return False
        return self._pool.all_exhausted

    @property
    def _gemini_calls_per_key(self) -> dict[int, int]:
        if self._pool is None:
            return {}
        return {s.index: s.calls for s in self._pool.slots if s.calls > 0}

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if self._pool is not None and self._pool.all_exhausted:
            return self._groq_chat(messages, tools, tool_choice)

        if self._injected_gemini is not None:
            return self._gemini_with_retries(
                self._injected_gemini, messages, tools, tool_choice
            )

        return self._gemini_with_pool(messages, tools, tool_choice)

    def _gemini_with_retries(
        self,
        client: genai.Client,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Retry loop for a single Gemini client (injected or from pool slot)."""
        last_error: genai_errors.APIError | Exception | None = None
        models = list(self._model_router.models_for_request())
        model_index = 0
        attempted_recovery = len(models) > 1 and models[0] == GEMINI_MODEL

        while model_index < len(models):
            model = models[model_index]
            for attempt in range(GEMINI_MAX_RETRIES):
                try:
                    result = self._gemini_chat(
                        client, messages, tools, tool_choice, model=model
                    )
                    self._model_router.record_success(model)
                    return result
                except genai_errors.APIError as exc:
                    last_error = exc
                    if exc.code in GEMINI_KEY_ROTATION_STATUS_CODES:
                        break
                    if exc.code in HIGH_DEMAND_STATUS_CODES:
                        self._model_router.record_high_demand_failure()
                        if model == GEMINI_MODEL and self._model_router.using_fallback:
                            _append_missing_fallback_models(models)
                        if attempt < GEMINI_MAX_RETRIES - 1:
                            delay = GEMINI_RETRY_BACKOFF_SECONDS * (2**attempt)
                            logger.warning(
                                "Gemini %s high demand (%s), retrying in %ss (%d/%d)",
                                model,
                                exc,
                                delay,
                                attempt + 1,
                                GEMINI_MAX_RETRIES,
                            )
                            time.sleep(delay)
                            continue
                        break
                    if (
                        exc.code in GEMINI_RETRYABLE_STATUS_CODES
                        and attempt < GEMINI_MAX_RETRIES - 1
                    ):
                        delay = GEMINI_RETRY_BACKOFF_SECONDS * (2**attempt)
                        logger.warning(
                            "Gemini %s failed (%s), retrying in %ss (%d/%d)",
                            model,
                            exc,
                            delay,
                            attempt + 1,
                            GEMINI_MAX_RETRIES,
                        )
                        time.sleep(delay)
                        continue
                    break
                except Exception as exc:
                    last_error = exc
                    break

            if (
                attempted_recovery
                and model == GEMINI_MODEL
                and isinstance(last_error, genai_errors.APIError)
                and last_error.code in HIGH_DEMAND_STATUS_CODES
            ):
                self._model_router.record_primary_recovery_failure()
                logger.warning(
                    "Gemini primary %s still unavailable after cooldown, "
                    "continuing with %s",
                    GEMINI_MODEL,
                    ", ".join(GEMINI_FALLBACK_MODELS),
                )

            model_index += 1

        if last_error is not None and self._should_fallback(last_error):
            logger.warning("Gemini failed (%s), falling back to Groq", last_error)
            return self._groq_chat(messages, tools, tool_choice)
        if last_error:
            raise last_error
        raise LLMProviderError("Gemini failed without a response")

    def _gemini_with_pool(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
    ) -> dict[str, Any]:
        assert self._pool is not None
        last_error: Exception | None = None
        attempted_slots: set[int] = set()

        while True:
            slot = self._pool.next_slot()
            if slot is None:
                break
            if slot.index in attempted_slots:
                break
            attempted_slots.add(slot.index)

            models = list(self._model_router.models_for_request())
            attempted_recovery = len(models) > 1 and models[0] == GEMINI_MODEL
            slot_failed = False
            model_index = 0

            while model_index < len(models):
                model = models[model_index]
                for attempt in range(GEMINI_MAX_RETRIES):
                    try:
                        result = self._gemini_chat(
                            slot.client, messages, tools, tool_choice, model=model
                        )
                        slot.increment_calls()
                        self._model_router.record_success(model)
                        return result
                    except genai_errors.APIError as exc:
                        last_error = exc
                        if exc.code in GEMINI_KEY_ROTATION_STATUS_CODES:
                            logger.warning(
                                "Gemini %s failed (%s), rotating",
                                slot.label,
                                exc,
                            )
                            self._pool.mark_exhausted(slot)
                            slot_failed = True
                            break
                        if exc.code in HIGH_DEMAND_STATUS_CODES:
                            self._model_router.record_high_demand_failure()
                            if (
                                model == GEMINI_MODEL
                                and self._model_router.using_fallback
                            ):
                                _append_missing_fallback_models(models)
                            if attempt < GEMINI_MAX_RETRIES - 1:
                                delay = GEMINI_RETRY_BACKOFF_SECONDS * (2**attempt)
                                logger.warning(
                                    "Gemini %s high demand on %s (%s), retrying in %ss (%d/%d)",
                                    slot.label,
                                    model,
                                    exc,
                                    delay,
                                    attempt + 1,
                                    GEMINI_MAX_RETRIES,
                                )
                                time.sleep(delay)
                                continue
                            logger.warning(
                                "Gemini %s high demand on %s (%s), rotating key",
                                slot.label,
                                model,
                                exc,
                            )
                            break
                        if (
                            exc.code in GEMINI_RETRYABLE_STATUS_CODES
                            and attempt < GEMINI_MAX_RETRIES - 1
                        ):
                            delay = GEMINI_RETRY_BACKOFF_SECONDS * (2**attempt)
                            logger.warning(
                                "Gemini %s failed (%s), retrying in %ss (%d/%d)",
                                slot.label,
                                exc,
                                delay,
                                attempt + 1,
                                GEMINI_MAX_RETRIES,
                            )
                            time.sleep(delay)
                            continue
                        logger.warning(
                            "Gemini %s failed (%s), rotating key",
                            slot.label,
                            exc,
                        )
                        break
                    except Exception as exc:
                        last_error = exc
                        logger.warning(
                            "Gemini %s unexpected error (%s: %s), rotating",
                            slot.label,
                            type(exc).__name__,
                            exc,
                        )
                        slot_failed = True
                        break

                if slot_failed:
                    break

                if (
                    attempted_recovery
                    and model == GEMINI_MODEL
                    and isinstance(last_error, genai_errors.APIError)
                    and last_error.code in HIGH_DEMAND_STATUS_CODES
                ):
                    self._model_router.record_primary_recovery_failure()
                    logger.warning(
                        "Gemini primary %s still unavailable after cooldown on %s, "
                        "continuing with %s",
                        GEMINI_MODEL,
                        slot.label,
                        ", ".join(GEMINI_FALLBACK_MODELS),
                    )

                model_index += 1

            if slot_failed:
                continue

            if (
                isinstance(last_error, genai_errors.APIError)
                and last_error.code in HIGH_DEMAND_STATUS_CODES
            ):
                continue

        if last_error is not None:
            should_fallback = (
                isinstance(last_error, genai_errors.APIError)
                and self._should_fallback(last_error)
            ) or not isinstance(last_error, genai_errors.APIError)
            if should_fallback:
                logger.warning(
                    "All Gemini keys exhausted (%s), using Groq for remaining calls",
                    last_error,
                )
                return self._groq_chat(messages, tools, tool_choice)
            raise last_error
        raise LLMProviderError("Gemini failed without a response")

    def _should_fallback(self, exc: genai_errors.APIError) -> bool:
        return exc.code in GEMINI_FALLBACK_STATUS_CODES

    def _gemini_chat(
        self,
        client: genai.Client,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
        *,
        model: str | None = None,
    ) -> dict[str, Any]:
        active_model = model or GEMINI_MODEL
        contents, system_instruction = self._messages_to_gemini(messages)
        gemini_tools = self._tools_to_gemini(tools)
        config_kwargs: dict[str, Any] = {
            "tools": gemini_tools,
            "automatic_function_calling": types.AutomaticFunctionCallingConfig(
                disable=True
            ),
            "http_options": types.HttpOptions(
                timeout=GEMINI_REQUEST_TIMEOUT_SECONDS * 1000
            ),
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if tool_choice and tool_choice != "auto":
            config_kwargs["tool_config"] = types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(mode="ANY")
            )

        response = client.models.generate_content(
            model=active_model,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
        self.provider = "gemini"
        return self._parse_gemini_response(response)

    def _parse_gemini_response(self, response: Any) -> dict[str, Any]:
        tool_calls: list[dict[str, Any]] = []
        text_parts: list[str] = []

        for part in response.candidates[0].content.parts:
            if getattr(part, "text", None):
                text_parts.append(part.text)
            function_call = getattr(part, "function_call", None)
            if function_call and function_call.name:
                tool_calls.append(
                    {
                        "id": None,
                        "name": function_call.name,
                        "arguments": dict(function_call.args),
                    }
                )

        return {
            "provider": "gemini",
            "content": "\n".join(text_parts) if text_parts else None,
            "tool_calls": tool_calls,
        }

    def _get_groq(self) -> Groq:
        if self._groq is None:
            if not self._groq_keys:
                raise LLMProviderError(
                    "GROQ_API_KEYS is not set; provide one or more comma-separated "
                    "Groq API keys for fallback"
                )
            self._groq = Groq(
                api_key=self._groq_keys[self._groq_keys_index],
                timeout=GROQ_REQUEST_TIMEOUT_SECONDS,
            )
        return self._groq

    def _advance_groq_key(self) -> bool:
        if self._groq_is_injected:
            return False
        with self._groq_lock:
            if self._groq_keys_index + 1 >= len(self._groq_keys):
                return False
            self._groq_keys_index += 1
            self._groq = Groq(
                api_key=self._groq_keys[self._groq_keys_index],
                timeout=GROQ_REQUEST_TIMEOUT_SECONDS,
            )
            logger.info(
                "Rotated to Groq key %d/%d",
                self._groq_keys_index + 1,
                len(self._groq_keys),
            )
            return True

    def _groq_chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
    ) -> dict[str, Any]:
        last_error: Exception | None = None

        while True:
            try:
                response = self._get_groq().chat.completions.create(
                    model=GROQ_MODEL,
                    messages=self._normalize_messages_for_groq(messages),
                    tools=tools,
                    tool_choice=tool_choice or "auto",
                )
                self.provider = "groq"
                with self._groq_lock:
                    self._groq_calls += 1
                return self._parse_groq_response(response)
            except Exception as exc:
                last_error = exc
                if self._advance_groq_key():
                    logger.warning("Groq key failed (%s), trying next key", exc)
                    continue
                raise LLMProviderError(
                    f"Both Gemini and Groq failed. Groq error: {last_error}"
                ) from last_error

    def log_usage_summary(self) -> None:
        if self._pool is not None:
            gemini_total = sum(s.calls for s in self._pool.slots)
            active = sum(1 for s in self._pool.slots if s.calls > 0)
            exhausted_count = sum(1 for s in self._pool.slots if s.exhausted)
            parts = [
                f"Gemini: {gemini_total} calls across {active}/{len(self._pool.slots)} keys "
                f"({exhausted_count} exhausted)"
            ]
            for slot in self._pool.slots:
                status = "exhausted" if slot.exhausted else "ok"
                parts.append(f"  {slot.label}: {slot.calls} calls ({status})")
        else:
            parts = ["Gemini: injected client (no key pool)"]
        if self._groq_calls:
            parts.append(f"Groq fallback: {self._groq_calls} calls")
        if self._model_router.using_fallback:
            parts.append(
                f"Active Gemini models: {', '.join(GEMINI_FALLBACK_MODELS)} (fallback)"
            )
        else:
            parts.append(f"Active Gemini model: {GEMINI_MODEL}")
        if self._gemini_exhausted:
            parts.append("WARNING: all Gemini keys were exhausted during this run")

        total = (
            sum(s.calls for s in self._pool.slots) if self._pool else 0
        ) + self._groq_calls
        parts.append(f"Total API calls: {total}")
        logger.info("Usage summary:\n%s", "\n".join(parts))

    def _normalize_messages_for_groq(
        self, messages: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        tool_call_index = 0

        for message in messages:
            role = message["role"]
            if role == "system":
                normalized.append({"role": "system", "content": message["content"]})
                continue
            if role == "user":
                normalized.append({"role": "user", "content": message["content"]})
                continue
            if role == "assistant":
                groq_tool_calls = []
                for tool_call in message.get("tool_calls", []):
                    tool_call_index += 1
                    arguments = tool_call.get("arguments", {})
                    arguments_json = (
                        arguments
                        if isinstance(arguments, str)
                        else json.dumps(arguments)
                    )
                    groq_tool_calls.append(
                        {
                            "id": tool_call.get("id") or f"call_{tool_call_index}",
                            "type": "function",
                            "function": {
                                "name": tool_call["name"],
                                "arguments": arguments_json,
                            },
                        }
                    )
                assistant_message: dict[str, Any] = {"role": "assistant"}
                if groq_tool_calls:
                    assistant_message["tool_calls"] = groq_tool_calls
                content = message.get("content")
                if content:
                    assistant_message["content"] = content
                elif not groq_tool_calls:
                    assistant_message["content"] = ""
                normalized.append(assistant_message)
                continue
            if role == "tool":
                normalized.append(
                    {
                        "role": "tool",
                        "tool_call_id": message.get(
                            "tool_call_id", f"call_{tool_call_index}"
                        ),
                        "content": message.get("content", ""),
                    }
                )

        return normalized

    def _parse_groq_response(self, response: Any) -> dict[str, Any]:
        message = response.choices[0].message
        tool_calls = []
        if message.tool_calls:
            for tool_call in message.tool_calls:
                tool_calls.append(
                    {
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "arguments": json.loads(tool_call.function.arguments),
                    }
                )
        return {
            "provider": "groq",
            "content": message.content,
            "tool_calls": tool_calls,
        }

    def _messages_to_gemini(
        self, messages: list[dict[str, Any]]
    ) -> tuple[list[types.Content], str | None]:
        system_parts: list[str] = []
        contents: list[types.Content] = []

        for message in messages:
            role = message["role"]
            content = message.get("content", "")

            if role == "system":
                system_parts.append(content)
            elif role == "user":
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=content)])
                )
            elif role == "assistant":
                parts: list[types.Part] = []
                if content:
                    parts.append(types.Part(text=content))
                for tool_call in message.get("tool_calls", []):
                    parts.append(
                        types.Part(
                            function_call=types.FunctionCall(
                                name=tool_call["name"],
                                args=tool_call.get("arguments", {}),
                            )
                        )
                    )
                contents.append(types.Content(role="model", parts=parts))
            elif role == "tool":
                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(
                                function_response=types.FunctionResponse(
                                    name=message.get("name", ""),
                                    response={"result": content},
                                )
                            )
                        ],
                    )
                )

        system_instruction = "\n\n".join(system_parts) if system_parts else None
        return contents, system_instruction

    def _tools_to_gemini(self, tools: list[dict[str, Any]]) -> list[types.Tool]:
        declarations: list[types.FunctionDeclaration] = []
        for tool in tools:
            function = tool["function"]
            declaration_kwargs: dict[str, Any] = {
                "name": function["name"],
                "description": function.get("description", ""),
            }
            if "parameters" in function:
                declaration_kwargs["parameters"] = self._to_genai_schema(
                    function["parameters"]
                )
            declarations.append(types.FunctionDeclaration(**declaration_kwargs))
        return [types.Tool(function_declarations=declarations)]

    def _to_genai_schema(self, schema: dict[str, Any]) -> types.Schema:
        type_map = {
            "object": "OBJECT",
            "string": "STRING",
            "integer": "INTEGER",
            "number": "NUMBER",
            "boolean": "BOOLEAN",
            "array": "ARRAY",
        }
        kwargs: dict[str, Any] = {}
        if "type" in schema:
            kwargs["type"] = type_map.get(schema["type"], schema["type"].upper())
        if "description" in schema:
            kwargs["description"] = schema["description"]
        if "enum" in schema:
            kwargs["enum"] = schema["enum"]
        if "properties" in schema:
            kwargs["properties"] = {
                key: self._to_genai_schema(value)
                for key, value in schema["properties"].items()
            }
        if "items" in schema:
            kwargs["items"] = self._to_genai_schema(schema["items"])
        if "required" in schema:
            kwargs["required"] = schema["required"]
        return types.Schema(**kwargs)
