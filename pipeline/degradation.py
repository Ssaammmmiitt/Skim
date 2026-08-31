"""Graceful degradation when agent reasoning is partial or unavailable."""

from __future__ import annotations

import logging
from typing import Any

from pipeline.agent.llm_client import LLMProviderError
from pipeline.agent.reasoning import DEFAULT_DIGEST_SIZE, run_agent_reasoning
from pipeline.db import get_todays_classified_articles, get_todays_new_articles

logger = logging.getLogger(__name__)

FALLBACK_RATIONALE = (
    "Simplified digest  -  full agent reasoning was unavailable for this run."
)


def simplified_digest_articles(
    articles: list[dict[str, Any]], limit: int = DEFAULT_DIGEST_SIZE
) -> list[dict[str, Any]]:
    """Pick newest articles with titles/summaries only (no insights)."""
    simplified: list[dict[str, Any]] = []
    for article in articles[:limit]:
        simplified.append(
            {
                **article,
                "topic": article.get("topic") or "other",
                "insight": None,
                "key_takeaway": None,
            }
        )
    return simplified


def fallback_article_pool(new_articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Best available articles when agent selection returns nothing."""
    if new_articles:
        return new_articles

    classified = get_todays_classified_articles()
    if classified:
        return classified

    return get_todays_new_articles()


def select_digest_articles(
    new_articles: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], str, bool]:
    """Run agent reasoning, falling back to a simplified digest when needed.

    Returns (articles, rationale, degraded).
    """
    try:
        selection = run_agent_reasoning(new_articles)
        articles = selection.get("articles") or []
        if articles:
            return articles, selection.get("rationale", ""), False
        logger.warning("Agent reasoning returned no stories; using fallback selection")
    except LLMProviderError as exc:
        logger.warning("LLM unavailable (%s). Using simplified digest fallback.", exc)
    except Exception as exc:
        logger.warning(
            "Agent reasoning failed (%s). Using simplified digest fallback.", exc
        )

    pool = fallback_article_pool(new_articles)
    if not pool:
        return [], "", True

    return simplified_digest_articles(pool), FALLBACK_RATIONALE, True
