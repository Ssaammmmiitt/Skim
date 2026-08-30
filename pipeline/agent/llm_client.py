import json
import logging
import os
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

GEMINI_MODEL = "gemini-2.5-flash"
GROQ_MODEL = "openai/gpt-oss-120b"

GEMINI_FALLBACK_STATUS_CODES = {429, 500, 502, 503, 504}

# 429 is excluded: Gemini's free tier quota is per-day, so a short backoff never
# clears it. Rotate to the next key or fall through to Groq instead.
GEMINI_RETRYABLE_STATUS_CODES = {500, 502, 503, 504}
GEMINI_QUOTA_STATUS_CODES = {429}
GEMINI_MAX_RETRIES = 3
GEMINI_RETRY_BACKOFF_SECONDS = 2


class LLMProviderError(Exception):
    """Raised when both Gemini and Groq fail."""


def _parse_csv_keys(env_var: str) -> list[str]:
    raw = os.environ.get(env_var, "")
    return [key.strip() for key in raw.split(",") if key.strip()]


class LLMClient:
    """Gemini-primary LLM client with Groq fallback.

    Both providers accept multiple comma-separated API keys via GEMINI_API_KEYS
    and GROQ_API_KEYS. Gemini keys must come from separate Google Cloud projects
    to get separate quota buckets, since the free tier meters per project rather
    than per key.
    """

    def __init__(
        self,
        gemini_client: genai.Client | None = None,
        groq_client: Groq | None = None,
    ):
        self._gemini_keys = _parse_csv_keys("GEMINI_API_KEYS")
        self._groq_keys = _parse_csv_keys("GROQ_API_KEYS")
        self._gemini_key_index = 0
        self._groq_key_index = 0

        if gemini_client is not None:
            self._gemini = gemini_client
        elif self._gemini_keys:
            self._gemini = genai.Client(api_key=self._gemini_keys[0])
        else:
            raise LLMProviderError(
                "GEMINI_API_KEYS is not set; provide one or more comma-separated "
                "Gemini API keys"
            )

        self._gemini_is_injected = gemini_client is not None
        self._groq = groq_client
        self._groq_is_injected = groq_client is not None
        self.provider = "gemini"

    def _advance_gemini_key(self) -> bool:
        """Switch to the next Gemini key. Returns False when none are left."""
        if self._gemini_is_injected:
            return False
        if self._gemini_key_index + 1 >= len(self._gemini_keys):
            return False

        self._gemini_key_index += 1
        self._gemini = genai.Client(api_key=self._gemini_keys[self._gemini_key_index])
        logger.info(
            "Rotated to Gemini key %d/%d",
            self._gemini_key_index + 1,
            len(self._gemini_keys),
        )
        return True

    def _advance_groq_key(self) -> bool:
        if self._groq_is_injected:
            return False
        if self._groq_key_index + 1 >= len(self._groq_keys):
            return False

        self._groq_key_index += 1
        self._groq = Groq(api_key=self._groq_keys[self._groq_key_index])
        logger.info(
            "Rotated to Groq key %d/%d",
            self._groq_key_index + 1,
            len(self._groq_keys),
        )
        return True

    def _get_groq(self) -> Groq:
        if self._groq is None:
            if not self._groq_keys:
                raise LLMProviderError(
                    "GROQ_API_KEYS is not set; provide one or more comma-separated "
                    "Groq API keys for fallback"
                )
            self._groq = Groq(api_key=self._groq_keys[self._groq_key_index])
        return self._groq

    def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        try:
            return self._gemini_chat_all_keys(messages, tools, tool_choice)
        except genai_errors.APIError as exc:
            if not self._should_fallback_from_gemini(exc):
                raise
            logger.warning("Gemini failed (%s), falling back to Groq", exc)
            return self._groq_chat(messages, tools, tool_choice)

    def _gemini_chat_all_keys(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Run the Gemini pass, rotating keys when a key's quota is exhausted."""
        last_error: genai_errors.APIError | None = None

        while True:
            for attempt in range(GEMINI_MAX_RETRIES):
                try:
                    return self._gemini_chat(messages, tools, tool_choice)
                except genai_errors.APIError as exc:
                    last_error = exc
                    if (
                        exc.code in GEMINI_RETRYABLE_STATUS_CODES
                        and attempt < GEMINI_MAX_RETRIES - 1
                    ):
                        delay = GEMINI_RETRY_BACKOFF_SECONDS * (2**attempt)
                        logger.warning(
                            "Gemini failed (%s), retrying in %ss (attempt %d/%d)",
                            exc,
                            delay,
                            attempt + 1,
                            GEMINI_MAX_RETRIES,
                        )
                        time.sleep(delay)
                        continue
                    break

            quota_exhausted = (
                last_error is not None
                and last_error.code in GEMINI_QUOTA_STATUS_CODES
            )
            if quota_exhausted and self._advance_gemini_key():
                continue

            if last_error:
                raise last_error
            raise LLMProviderError("Gemini failed without a response")

    def _should_fallback_from_gemini(self, exc: genai_errors.APIError) -> bool:
        return exc.code in GEMINI_FALLBACK_STATUS_CODES

    def _gemini_chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        tool_choice: str | dict[str, Any] | None,
    ) -> dict[str, Any]:
        contents, system_instruction = self._messages_to_gemini(messages)
        gemini_tools = self._tools_to_gemini(tools)
        config_kwargs: dict[str, Any] = {
            "tools": gemini_tools,
            "automatic_function_calling": types.AutomaticFunctionCallingConfig(
                disable=True
            ),
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction
        if tool_choice and tool_choice != "auto":
            config_kwargs["tool_config"] = types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(mode="ANY")
            )

        response = self._gemini.models.generate_content(
            model=GEMINI_MODEL,
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
                return self._parse_groq_response(response)
            except Exception as exc:
                last_error = exc
                if self._advance_groq_key():
                    logger.warning("Groq key failed (%s), trying next key", exc)
                    continue
                raise LLMProviderError(
                    f"Both Gemini and Groq failed. Groq error: {last_error}"
                ) from last_error

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
