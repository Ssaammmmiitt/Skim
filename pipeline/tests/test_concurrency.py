"""Tests for concurrent insight generation and thread-safe key pool.

Covers:
- ThreadPoolExecutor dispatching with bounded concurrency
- Round-robin key distribution under concurrent access
- Groq fallback when Gemini exhausts mid-batch in concurrent mode
- Error handling: partial failures, total failures, timeouts, unexpected exceptions
- Usage tracking accuracy with concurrent calls
- Thread safety of _GeminiKeyPool under contention
"""

import json
import logging
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest
from google.genai.errors import ClientError

# Stub out psycopg2 so we can import reasoning without a real DB driver
if "psycopg2" not in sys.modules:
    _psycopg2 = ModuleType("psycopg2")
    _psycopg2.connect = MagicMock()
    _ext = ModuleType("psycopg2.extensions")
    _ext.connection = type("connection", (), {})
    _psycopg2.extensions = _ext
    sys.modules["psycopg2"] = _psycopg2
    sys.modules["psycopg2.extensions"] = _ext

from pipeline.agent.llm_client import (
    LLMClient,
    LLMProviderError,
    _GeminiKeyPool,
    _GeminiKeySlot,
)
from pipeline.agent.reasoning import ArticleAgent


# ── Helpers ──────────────────────────────────────────────────────────────

def _make_articles(count: int, start_id: int = 1) -> list[dict]:
    return [
        {
            "id": start_id + i,
            "title": f"Test article {start_id + i}",
            "source": "test",
            "summary": f"Summary for article {start_id + i}.",
            "url": f"https://example.com/{start_id + i}",
            "topic": "ai_ml",
            "importance_score": 8,
        }
        for i in range(count)
    ]


def _insight_response(article_id: int) -> dict:
    return {
        "provider": "gemini",
        "content": None,
        "tool_calls": [
            {
                "name": "generate_insight",
                "arguments": {
                    "article_id": article_id,
                    "insight": f"Insightful analysis for article {article_id} with implications for teams.",
                    "key_takeaway": f"Key takeaway for article {article_id}.",
                },
            }
        ],
    }


def _groq_insight_response(article_id: int) -> dict:
    return {
        "provider": "groq",
        "content": None,
        "tool_calls": [
            {
                "name": "generate_insight",
                "arguments": {
                    "article_id": article_id,
                    "insight": f"Groq fallback insight for article {article_id} with forward-looking analysis.",
                    "key_takeaway": f"Groq takeaway for article {article_id}.",
                },
            }
        ],
    }


def _gemini_rate_limit_error() -> ClientError:
    return ClientError(429, {"error": {"message": "rate limit exceeded"}}, None)


# ── ThreadPoolExecutor concurrent insight generation ─────────────────────

class TestConcurrentInsightGeneration:

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_generates_all_insights(self, mock_update):
        """3 workers, 6 articles  -  all should succeed."""
        articles = _make_articles(6)

        def _always_succeed(*args, **kwargs):
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _always_succeed

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 6
        assert mock_llm.chat_with_tools.call_count == 6
        assert mock_update.call_count == 6
        result_ids = [r["article_id"] for r in results]
        expected_ids = [a["id"] for a in articles]
        assert result_ids == expected_ids

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_preserves_input_order(self, mock_update):
        """Results should match input article order, not completion order."""
        articles = _make_articles(5)

        def _response_for_article(*args, **kwargs):
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _response_for_article

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 5
        result_ids = [r["article_id"] for r in results]
        assert result_ids == [a["id"] for a in articles]

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_handles_partial_failures(self, mock_update):
        """Some workers fail, others succeed  -  partial results returned."""
        articles = _make_articles(4)
        call_count = 0
        call_lock = threading.Lock()

        def _alternate_fail(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current % 2 == 0:
                raise LLMProviderError("Both providers failed")
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _alternate_fail

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=2)

        assert len(results) == 2
        assert mock_llm.chat_with_tools.call_count == 4

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_handles_total_failure(self, mock_update):
        """All workers fail  -  returns empty list, logs error."""
        articles = _make_articles(3)

        def _always_fail(*args, **kwargs):
            raise LLMProviderError("All providers down")

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _always_fail

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert results == []
        assert mock_update.call_count == 0

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_handles_empty_tool_calls(self, mock_update):
        """LLM returns no tool calls for some articles."""
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _sometimes_empty(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                return {"provider": "gemini", "content": None, "tool_calls": []}
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _sometimes_empty

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=2)

        assert len(results) == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_handles_validation_errors(self, mock_update):
        """LLM returns invalid data  -  skipped without crashing other workers."""
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _sometimes_invalid(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                return {
                    "provider": "groq",
                    "content": None,
                    "tool_calls": [
                        {
                            "name": "generate_insight",
                            "arguments": {
                                "article_id": 999,
                                "insight": "",
                                "key_takeaway": "",
                            },
                        }
                    ],
                }
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _sometimes_invalid

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 2
        assert mock_update.call_count == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrent_handles_unexpected_exceptions(self, mock_update):
        """Unexpected RuntimeError from a worker doesn't crash the batch."""
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _sometimes_crash(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                raise RuntimeError("Unexpected failure")
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _sometimes_crash

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_concurrency_1_uses_sequential_path(self, mock_update):
        """concurrency=1 falls back to sequential generation."""
        articles = _make_articles(2)

        def _always_succeed(*args, **kwargs):
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _always_succeed

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=1)

        assert len(results) == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_single_article_uses_single_worker(self, mock_update):
        """Even with concurrency=3, 1 article only spawns 1 worker."""
        articles = _make_articles(1)
        mock_llm = MagicMock()
        mock_llm.chat_with_tools.return_value = _insight_response(articles[0]["id"])

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 1
        assert mock_llm.chat_with_tools.call_count == 1


# ── Groq fallback during concurrent execution ───────────────────────────

class TestConcurrentGroqFallback:

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_gemini_exhausts_mid_batch_remaining_use_groq(self, mock_update):
        """First few calls use Gemini, later calls fall back to Groq  -  all succeed."""
        articles = _make_articles(4)
        call_count = 0
        call_lock = threading.Lock()

        def _exhaust_then_groq(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current <= 2:
                return _insight_response(1)
            return _groq_insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _exhaust_then_groq

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=2)

        assert len(results) == 4
        assert mock_llm.chat_with_tools.call_count == 4

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_all_gemini_exhausted_all_go_to_groq(self, mock_update):
        """If all calls use Groq, all concurrent workers still succeed."""
        articles = _make_articles(3)

        def _all_groq(*args, **kwargs):
            return _groq_insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _all_groq

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 3
        for r in results:
            assert "Groq" in r["insight"]


# ── Thread-safe key pool under contention ────────────────────────────────

class TestKeyPoolThreadSafety:

    def test_pool_distributes_across_threads(self):
        """Multiple threads calling next_slot() get different keys."""
        pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
        pool._lock = threading.Lock()
        pool.all_exhausted = False
        slots = []
        for i in range(5):
            s = _GeminiKeySlot.__new__(_GeminiKeySlot)
            s.index = i
            s.total = 5
            s.calls = 0
            s.exhausted = False
            s._lock = threading.Lock()
            slots.append(s)
        pool._slots = slots
        pool._cursor = 0

        seen_indices: list[int] = []
        lock = threading.Lock()

        def _grab_slot():
            slot = pool.next_slot()
            if slot:
                with lock:
                    seen_indices.append(slot.index)

        threads = [threading.Thread(target=_grab_slot) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(seen_indices) == 10
        assert set(seen_indices) == {0, 1, 2, 3, 4}

    def test_pool_handles_concurrent_exhaustion(self):
        """Threads marking slots exhausted doesn't cause data races."""
        pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
        pool._lock = threading.Lock()
        pool.all_exhausted = False
        slots = []
        for i in range(3):
            s = _GeminiKeySlot.__new__(_GeminiKeySlot)
            s.index = i
            s.total = 3
            s.calls = 0
            s.exhausted = False
            s._lock = threading.Lock()
            slots.append(s)
        pool._slots = slots
        pool._cursor = 0

        def _exhaust_slot(slot_idx):
            pool.mark_exhausted(slots[slot_idx])

        threads = [threading.Thread(target=_exhaust_slot, args=(i,)) for i in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert pool.all_exhausted
        assert pool.next_slot() is None

    def test_pool_concurrent_next_slot_and_exhaust(self):
        """Simulates real workload: some threads get slots while others exhaust them."""
        pool = _GeminiKeyPool.__new__(_GeminiKeyPool)
        pool._lock = threading.Lock()
        pool.all_exhausted = False
        slots = []
        for i in range(5):
            s = _GeminiKeySlot.__new__(_GeminiKeySlot)
            s.index = i
            s.total = 5
            s.calls = 0
            s.exhausted = False
            s._lock = threading.Lock()
            slots.append(s)
        pool._slots = slots
        pool._cursor = 0

        results = {"got_slot": 0, "got_none": 0}
        lock = threading.Lock()

        def _worker():
            slot = pool.next_slot()
            if slot is not None:
                slot.increment_calls()
                time.sleep(0.01)
                if slot.index < 3:
                    pool.mark_exhausted(slot)
                with lock:
                    results["got_slot"] += 1
            else:
                with lock:
                    results["got_none"] += 1

        threads = [threading.Thread(target=_worker) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert results["got_slot"] + results["got_none"] == 20
        assert all(s.exhausted for s in slots[:3])
        total_calls = sum(s.calls for s in slots)
        assert total_calls == results["got_slot"]

    def test_slot_increment_calls_is_thread_safe(self):
        """Concurrent call increments don't lose counts."""
        slot = _GeminiKeySlot.__new__(_GeminiKeySlot)
        slot.index = 0
        slot.total = 1
        slot.calls = 0
        slot.exhausted = False
        slot._lock = threading.Lock()

        def _increment():
            for _ in range(100):
                slot.increment_calls()

        threads = [threading.Thread(target=_increment) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert slot.calls == 1000


# ── LLMClient pool integration under concurrent access ──────────────────

class TestLLMClientConcurrentPool:

    def test_concurrent_chat_calls_distribute_across_keys(self, monkeypatch):
        """Multiple threads calling chat_with_tools use different Gemini keys."""
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2,k3")
        call_keys: list[int] = []
        lock = threading.Lock()

        def _factory(api_key: str):
            key_idx = ["k1", "k2", "k3"].index(api_key)
            client = MagicMock()

            def _generate(*args, **kwargs):
                with lock:
                    call_keys.append(key_idx)
                time.sleep(0.01)
                part = MagicMock()
                part.text = None
                part.function_call = MagicMock()
                part.function_call.name = "classify_article"
                part.function_call.args = {"article_id": 1, "topic": "ai_ml", "importance_score": 8, "reasoning": "ok"}
                response = MagicMock()
                response.candidates = [MagicMock()]
                response.candidates[0].content.parts = [part]
                return response

            client.models.generate_content.side_effect = _generate
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

        llm_client = LLMClient()
        messages = [{"role": "user", "content": "test"}]
        tools = [{"function": {"name": "classify_article", "description": "test"}}]

        def _call():
            llm_client.chat_with_tools(messages, tools)

        threads = [threading.Thread(target=_call) for _ in range(9)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(call_keys) == 9
        assert set(call_keys) == {0, 1, 2}
        for key_idx in range(3):
            assert call_keys.count(key_idx) == 3

    def test_concurrent_calls_with_exhaustion_fall_to_groq(self, monkeypatch):
        """Concurrent calls where all Gemini keys exhaust → Groq used."""
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")

        def _factory(api_key: str):
            client = MagicMock()
            client.models.generate_content.side_effect = _gemini_rate_limit_error()
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

        groq_client = MagicMock()
        part_mock = MagicMock()
        part_mock.text = None
        fc = MagicMock()
        fc.name = "classify_article"
        fc.function.name = "classify_article"
        fc.function.arguments = json.dumps({"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"})
        fc.id = "call_1"
        message = MagicMock()
        message.content = None
        message.tool_calls = [fc]
        response = MagicMock()
        response.choices = [MagicMock(message=message)]
        groq_client.chat.completions.create.return_value = response

        llm_client = LLMClient(groq_client=groq_client)
        messages = [{"role": "user", "content": "test"}]
        tools = [{"function": {"name": "classify_article", "description": "test"}}]

        results = []
        lock = threading.Lock()

        def _call():
            r = llm_client.chat_with_tools(messages, tools)
            with lock:
                results.append(r)

        threads = [threading.Thread(target=_call) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(results) == 4
        assert llm_client._gemini_exhausted
        assert groq_client.chat.completions.create.call_count >= 1

    def test_usage_summary_accurate_after_concurrent_calls(self, monkeypatch):
        """Usage tracking is accurate even with concurrent threads."""
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2,k3")

        def _factory(api_key: str):
            client = MagicMock()
            part = MagicMock()
            part.text = None
            part.function_call = MagicMock()
            part.function_call.name = "classify_article"
            part.function_call.args = {"article_id": 1, "topic": "ai_ml", "importance_score": 8, "reasoning": "ok"}
            resp = MagicMock()
            resp.candidates = [MagicMock()]
            resp.candidates[0].content.parts = [part]
            client.models.generate_content.return_value = resp
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

        llm_client = LLMClient()
        messages = [{"role": "user", "content": "test"}]
        tools = [{"function": {"name": "classify_article", "description": "test"}}]

        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(llm_client.chat_with_tools, messages, tools) for _ in range(12)]
            for f in futures:
                f.result()

        calls = llm_client._gemini_calls_per_key
        total = sum(calls.values())
        assert total == 12
        assert llm_client._groq_calls == 0


# ── Error handling edge cases ────────────────────────────────────────────

class TestConcurrentErrorHandling:

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_timeout_error_doesnt_crash_batch(self, mock_update):
        """A TimeoutError from one worker doesn't affect others."""
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _sometimes_timeout(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                raise TimeoutError("Request timed out after 120s")
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _sometimes_timeout

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_connection_error_doesnt_crash_batch(self, mock_update):
        """A ConnectionError from one worker doesn't affect others."""
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _sometimes_disconnect(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 1:
                raise ConnectionError("Connection reset by peer")
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _sometimes_disconnect

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=2)

        assert len(results) == 2

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_mixed_provider_responses_tracked(self, mock_update):
        """Some insights from Gemini, some from Groq  -  all tracked."""
        articles = _make_articles(4)
        call_count = 0
        call_lock = threading.Lock()

        def _alternate_provider(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current % 2 == 0:
                return _groq_insight_response(1)
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _alternate_provider

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=2)

        assert len(results) == 4

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_db_write_failure_doesnt_crash_other_workers(self, mock_update):
        """If update_article_insight raises, the worker fails but others succeed."""
        articles = _make_articles(3)

        def _always_succeed(*args, **kwargs):
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _always_succeed

        call_count = 0
        call_lock = threading.Lock()

        def _failing_update(**kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                raise Exception("DB write failed")

        mock_update.side_effect = _failing_update

        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
        results = agent.generate_insights(articles, concurrency=3)

        assert len(results) >= 2


# ── Logging and reporting ────────────────────────────────────────────────

class TestConcurrencyLogging:

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_logs_all_succeeded(self, mock_update, caplog):
        articles = _make_articles(2)

        def _succeed(*args, **kwargs):
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _succeed
        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)

        with caplog.at_level(logging.INFO, logger="pipeline.agent.reasoning"):
            agent.generate_insights(articles, concurrency=2)

        assert any("all 2 articles succeeded" in r.message for r in caplog.records)

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_logs_partial_failure(self, mock_update, caplog):
        articles = _make_articles(3)
        call_count = 0
        call_lock = threading.Lock()

        def _one_fails(*args, **kwargs):
            nonlocal call_count
            with call_lock:
                call_count += 1
                current = call_count
            if current == 2:
                raise LLMProviderError("Provider failed")
            return _insight_response(1)

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _one_fails
        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)

        with caplog.at_level(logging.WARNING, logger="pipeline.agent.reasoning"):
            agent.generate_insights(articles, concurrency=3)

        assert any("2/3 succeeded" in r.message for r in caplog.records)

    @patch("pipeline.agent.reasoning.update_article_insight")
    def test_logs_total_failure(self, mock_update, caplog):
        articles = _make_articles(3)

        def _always_fail(*args, **kwargs):
            raise LLMProviderError("All down")

        mock_llm = MagicMock()
        mock_llm.chat_with_tools.side_effect = _always_fail
        agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)

        with caplog.at_level(logging.ERROR, logger="pipeline.agent.reasoning"):
            agent.generate_insights(articles, concurrency=2)

        assert any("ALL 3 articles failed" in r.message for r in caplog.records)

    def test_usage_summary_logs_exhausted_keys(self, monkeypatch, caplog):
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")

        def _factory(api_key: str):
            client = MagicMock()
            client.models.generate_content.side_effect = _gemini_rate_limit_error()
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

        groq_client = MagicMock()
        message = MagicMock()
        message.content = None
        tc = MagicMock()
        tc.id = "call_1"
        tc.function.name = "classify_article"
        tc.function.arguments = json.dumps({"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"})
        message.tool_calls = [tc]
        resp = MagicMock()
        resp.choices = [MagicMock(message=message)]
        groq_client.chat.completions.create.return_value = resp

        client = LLMClient(groq_client=groq_client)
        client.chat_with_tools(
            [{"role": "user", "content": "test"}],
            [{"function": {"name": "classify_article", "description": "test"}}],
        )

        with caplog.at_level(logging.INFO, logger="pipeline.agent.llm_client"):
            client.log_usage_summary()

        log_text = "\n".join(r.message for r in caplog.records)
        assert "exhausted" in log_text.lower()
        assert "Groq fallback: 1 calls" in log_text
        assert "Total API calls:" in log_text


# ── Pool with unexpected exceptions from Gemini ─────────────────────────

class TestPoolUnexpectedExceptions:

    def test_timeout_on_gemini_rotates_to_next_key(self, monkeypatch):
        """A non-APIError (like TimeoutError) rotates to the next key without exhausting."""
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")

        def _factory(api_key: str):
            client = MagicMock()
            if api_key == "k1":
                client.models.generate_content.side_effect = TimeoutError("timed out")
            else:
                part = MagicMock()
                part.text = None
                part.function_call = MagicMock()
                part.function_call.name = "classify_article"
                part.function_call.args = {"article_id": 1, "topic": "ai_ml", "importance_score": 8, "reasoning": "ok"}
                resp = MagicMock()
                resp.candidates = [MagicMock()]
                resp.candidates[0].content.parts = [part]
                client.models.generate_content.return_value = resp
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)
        llm_client = LLMClient()

        result = llm_client.chat_with_tools(
            [{"role": "user", "content": "test"}],
            [{"function": {"name": "classify_article", "description": "test"}}],
        )
        assert result["provider"] == "gemini"
        assert not llm_client._pool.slots[0].exhausted
        assert llm_client._pool.slots[1].calls == 1

    def test_all_keys_timeout_falls_to_groq(self, monkeypatch):
        """If all Gemini keys timeout, falls to Groq."""
        monkeypatch.setenv("GEMINI_API_KEYS", "k1,k2")

        def _factory(api_key: str):
            client = MagicMock()
            client.models.generate_content.side_effect = TimeoutError("timed out")
            return client

        monkeypatch.setattr("pipeline.agent.llm_client.genai.Client", _factory)

        groq_client = MagicMock()
        message = MagicMock()
        message.content = None
        tc = MagicMock()
        tc.id = "call_1"
        tc.function.name = "classify_article"
        tc.function.arguments = json.dumps({"article_id": 1, "topic": "ai_ml", "importance_score": 7, "reasoning": "ok"})
        message.tool_calls = [tc]
        resp = MagicMock()
        resp.choices = [MagicMock(message=message)]
        groq_client.chat.completions.create.return_value = resp

        llm_client = LLMClient(groq_client=groq_client)
        result = llm_client.chat_with_tools(
            [{"role": "user", "content": "test"}],
            [{"function": {"name": "classify_article", "description": "test"}}],
        )
        assert result["provider"] == "groq"
        assert not llm_client._gemini_exhausted
