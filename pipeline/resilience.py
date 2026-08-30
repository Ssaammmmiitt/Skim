"""Retry helpers for transient external API failures."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

DEFAULT_MAX_RETRIES = 3
DEFAULT_BACKOFF_BASE = 2


def retry_with_backoff(
    max_retries: int = DEFAULT_MAX_RETRIES,
    backoff_base: float = DEFAULT_BACKOFF_BASE,
    retryable_exceptions: tuple[type[BaseException], ...] = (Exception,),
) -> Callable[[F], F]:
    """Retry a function with exponential backoff on transient failures."""

    def decorator(fn: F) -> F:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_error: BaseException | None = None
            for attempt in range(max_retries):
                try:
                    return fn(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_error = exc
                    if attempt == max_retries - 1:
                        logger.error(
                            "%s failed after %d retries: %s",
                            fn.__name__,
                            max_retries,
                            exc,
                        )
                        raise
                    wait = backoff_base**attempt
                    logger.warning(
                        "%s attempt %d/%d failed: %s. Retrying in %ss",
                        fn.__name__,
                        attempt + 1,
                        max_retries,
                        exc,
                        wait,
                    )
                    time.sleep(wait)
            if last_error is not None:
                raise last_error
            raise RuntimeError(f"{fn.__name__} failed without an exception")

        return wrapper  # type: ignore[misc]

    return decorator


def call_with_retry(
    fn: Callable[..., Any],
    /,
    *args: Any,
    max_retries: int = DEFAULT_MAX_RETRIES,
    backoff_base: float = DEFAULT_BACKOFF_BASE,
    retryable_exceptions: tuple[type[BaseException], ...] = (Exception,),
    **kwargs: Any,
) -> Any:
    """Call a function once with the same retry policy as the decorator."""

    @retry_with_backoff(
        max_retries=max_retries,
        backoff_base=backoff_base,
        retryable_exceptions=retryable_exceptions,
    )
    def _wrapped() -> Any:
        return fn(*args, **kwargs)

    return _wrapped()
