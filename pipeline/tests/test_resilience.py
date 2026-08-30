import logging

import pytest

from pipeline.resilience import call_with_retry, retry_with_backoff


def test_retry_succeeds_on_third_attempt(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr("pipeline.resilience.time.sleep", lambda seconds: sleeps.append(seconds))
    attempts = {"count": 0}

    @retry_with_backoff(max_retries=3, backoff_base=2, retryable_exceptions=(ValueError,))
    def flaky() -> str:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise ValueError("temporary")
        return "ok"

    assert flaky() == "ok"
    assert attempts["count"] == 3
    assert sleeps == [1, 2]


def test_retry_raises_after_max_retries(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr("pipeline.resilience.time.sleep", lambda seconds: sleeps.append(seconds))

    @retry_with_backoff(max_retries=3, backoff_base=2, retryable_exceptions=(RuntimeError,))
    def always_fails() -> None:
        raise RuntimeError("nope")

    with pytest.raises(RuntimeError, match="nope"):
        always_fails()

    assert sleeps == [1, 2]


def test_retry_uses_exponential_backoff(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr("pipeline.resilience.time.sleep", lambda seconds: sleeps.append(seconds))
    attempts = {"count": 0}

    @retry_with_backoff(max_retries=4, backoff_base=2, retryable_exceptions=(OSError,))
    def fail_three_times() -> str:
        attempts["count"] += 1
        if attempts["count"] < 4:
            raise OSError("retry me")
        return "done"

    assert fail_three_times() == "done"
    assert sleeps == [1, 2, 4]


def test_retry_does_not_catch_unlisted_exceptions():
    @retry_with_backoff(max_retries=3, retryable_exceptions=(ValueError,))
    def raises_type_error() -> None:
        raise TypeError("wrong type")

    with pytest.raises(TypeError, match="wrong type"):
        raises_type_error()


def test_call_with_retry_matches_decorator(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr("pipeline.resilience.time.sleep", lambda seconds: sleeps.append(seconds))
    attempts = {"count": 0}

    def work() -> int:
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise ValueError("again")
        return 42

    assert call_with_retry(work, retryable_exceptions=(ValueError,)) == 42
    assert sleeps == [1]


def test_retry_logs_warning_and_error(caplog):
    @retry_with_backoff(max_retries=2, retryable_exceptions=(ValueError,))
    def boom() -> None:
        raise ValueError("broken")

    with caplog.at_level(logging.WARNING, logger="pipeline.resilience"):
        with pytest.raises(ValueError, match="broken"):
            boom()

    messages = [record.message for record in caplog.records]
    assert any("attempt 1/2 failed" in message for message in messages)
    assert any("failed after 2 retries" in message for message in messages)
