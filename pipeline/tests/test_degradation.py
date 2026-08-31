from unittest.mock import patch

import pytest

from pipeline.agent.llm_client import LLMProviderError
from pipeline.degradation import (
    fallback_article_pool,
    select_digest_articles,
    simplified_digest_articles,
)


def _article(article_id: int, title: str) -> dict:
    return {
        "id": article_id,
        "title": title,
        "url": f"https://example.com/{article_id}",
        "source": "hackernews",
        "summary": f"Summary for {title}",
    }


def test_simplified_digest_articles_clears_insights():
    articles = simplified_digest_articles(
        [
            {
                **_article(1, "One"),
                "insight": "Deep take",
                "key_takeaway": "Takeaway",
                "topic": "ai_ml",
            }
        ]
    )

    assert articles[0]["insight"] is None
    assert articles[0]["key_takeaway"] is None
    assert articles[0]["topic"] == "ai_ml"
    assert articles[0]["title"] == "One"


def test_simplified_digest_articles_limits_to_eight():
    articles = simplified_digest_articles(
        [_article(i, f"Story {i}") for i in range(12)]
    )
    assert len(articles) == 8


@patch("pipeline.degradation.get_todays_new_articles", return_value=[])
@patch("pipeline.degradation.get_todays_classified_articles", return_value=[])
def test_fallback_article_pool_prefers_new_articles(_, __):
    new = [_article(1, "Fresh")]
    assert fallback_article_pool(new) == new


@patch(
    "pipeline.degradation.get_todays_new_articles", return_value=[_article(3, "Today")]
)
@patch(
    "pipeline.degradation.get_todays_classified_articles",
    return_value=[_article(2, "Classified")],
)
def test_fallback_article_pool_uses_classified_when_no_new(_, __):
    assert fallback_article_pool([])[0]["title"] == "Classified"


@patch("pipeline.degradation.run_agent_reasoning")
def test_select_digest_articles_uses_agent_result(mock_reasoning):
    mock_reasoning.return_value = {
        "articles": [_article(1, "Chosen")],
        "rationale": "Best story today.",
    }

    articles, rationale, degraded = select_digest_articles([_article(1, "Chosen")])

    assert not degraded
    assert articles[0]["title"] == "Chosen"
    assert rationale == "Best story today."


@patch("pipeline.degradation.run_agent_reasoning", side_effect=LLMProviderError("down"))
def test_select_digest_articles_falls_back_on_llm_failure(mock_reasoning):
    new = [_article(1, "Fallback story")]

    articles, rationale, degraded = select_digest_articles(new)

    assert degraded
    assert len(articles) == 1
    assert articles[0]["title"] == "Fallback story"
    assert articles[0]["insight"] is None
    assert "unavailable" in rationale.lower()
    mock_reasoning.assert_called_once()


@patch(
    "pipeline.degradation.run_agent_reasoning",
    return_value={"articles": [], "rationale": ""},
)
def test_select_digest_articles_falls_back_when_agent_returns_empty(_):
    articles, _, degraded = select_digest_articles([_article(1, "Backup")])

    assert degraded
    assert articles[0]["title"] == "Backup"


@patch("pipeline.degradation.run_agent_reasoning", side_effect=LLMProviderError("down"))
@patch("pipeline.degradation.fallback_article_pool", return_value=[])
def test_select_digest_articles_returns_empty_when_no_pool(_, __):
    articles, rationale, degraded = select_digest_articles([])

    assert degraded
    assert articles == []
    assert rationale == ""
