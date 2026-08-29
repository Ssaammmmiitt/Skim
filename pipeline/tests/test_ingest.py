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
        patch("pipeline.ingest._build_adapters", return_value=[bad_adapter, good_adapter]),
        patch("pipeline.ingest.insert_articles", return_value=1) as mock_insert,
        patch("pipeline.ingest.get_todays_new_articles", return_value=[]),
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


@pytest.mark.integration
def test_ingest_dedupes_on_immediate_rerun():
    ingest_all_sources(limit=5)

    new_count = None

    def spy_insert(articles):
        nonlocal new_count
        new_count = insert_articles(articles)
        return new_count

    with patch("pipeline.ingest.insert_articles", side_effect=spy_insert):
        ingest_all_sources(limit=5)

    assert new_count == 0
