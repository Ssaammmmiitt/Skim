from datetime import datetime, timezone
from unittest.mock import Mock, patch

import pytest

from pipeline.db import insert_articles
from pipeline.ingest import ingest_all_sources
from pipeline.models import Article


def test_ingest_continues_when_one_adapter_fails():
    good_article = Article(
        title="Good article",
        url="https://example.com/good",
        source="good",
        published_at=datetime.now(timezone.utc),
        summary="summary",
    )
    good_adapter = Mock()
    good_adapter.name = "good"
    good_adapter.fetch.return_value = [good_article]

    bad_adapter = Mock()
    bad_adapter.name = "bad"
    bad_adapter.fetch.side_effect = RuntimeError("feed unavailable")

    with (
        patch(
            "pipeline.ingest._build_adapters", return_value=[bad_adapter, good_adapter]
        ),
        patch("pipeline.ingest.insert_articles", return_value=1) as mock_insert,
        patch("pipeline.ingest.get_todays_new_articles", return_value=[]),
        patch("pipeline.ingest.get_articles_by_urls", return_value=[]),
    ):
        result = ingest_all_sources(limit=5)

    mock_insert.assert_called_once_with([good_article])
    assert result == []


@pytest.mark.integration
def test_ingest_fetches_from_live_sources():
    with patch("pipeline.ingest.insert_articles", wraps=insert_articles) as mock_insert:
        ingest_all_sources(limit=5)

    articles = mock_insert.call_args[0][0]
    assert len(articles) > 0


def test_ingest_dedupes_on_immediate_rerun():
    good_article = Article(
        title="Dedupe article",
        url="https://example.com/dedupe",
        source="dedupe",
        published_at=datetime.now(timezone.utc),
        summary="summary",
    )
    good_adapter = Mock()
    good_adapter.name = "good"
    good_adapter.fetch.return_value = [good_article]

    mock_db_state = []

    def fake_get_articles_by_urls(urls):
        return [row for row in mock_db_state if row["url"] in urls]

    def fake_insert(articles):
        new_count = 0
        existing_urls = {row["url"] for row in mock_db_state}
        for a in articles:
            if str(a.url) not in existing_urls:
                mock_db_state.append({"url": str(a.url)})
                new_count += 1
        return new_count

    with (
        patch("pipeline.ingest._build_adapters", return_value=[good_adapter]),
        patch("pipeline.ingest.get_todays_new_articles", return_value=[]),
        patch("pipeline.ingest.get_articles_by_urls", side_effect=fake_get_articles_by_urls),
        patch("pipeline.ingest.insert_articles", side_effect=fake_insert)
    ):
        # Run 1: Should "insert" 1 new article
        ingest_all_sources(limit=5)
        assert len(mock_db_state) == 1

        # Run 2: Should deduplicate
        ingest_all_sources(limit=5)
        # Assuming ingest_all_sources returns the result of get_todays_new_articles (which we mocked to [])
        # We can just verify our fake DB state didn't grow
        assert len(mock_db_state) == 1
