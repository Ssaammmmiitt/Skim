from pathlib import Path
from unittest.mock import patch

import feedparser
import pytest

from pipeline.sources.rss import RSSAdapter

FIXTURES = Path(__file__).parent / "fixtures"
FULL_FEED = feedparser.parse((FIXTURES / "sample_rss.xml").read_text())
SPARSE_FEED = feedparser.parse((FIXTURES / "sample_rss_sparse.xml").read_text())
INVALID_FEED = feedparser.parse("this is not valid xml")


@patch("pipeline.sources.rss.feedparser.parse")
def test_fetch_parses_full_rss(mock_parse):
    mock_parse.return_value = FULL_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    assert len(articles) == 1
    assert articles[0].title == "Full Article"
    assert articles[0].url == "https://example.com/full"
    assert articles[0].source == "testfeed"
    assert articles[0].summary == "Full description here."
    assert articles[0].published_at is not None


@patch("pipeline.sources.rss.feedparser.parse")
def test_fetch_handles_missing_fields_and_bad_links(mock_parse):
    mock_parse.return_value = SPARSE_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    assert len(articles) == 1
    assert articles[0].title == "Sparse Article"
    assert articles[0].url == "https://example.com/sparse"
    assert articles[0].published_at is None
    assert articles[0].summary is None


@patch("pipeline.sources.rss.feedparser.parse")
def test_fetch_invalid_xml_returns_empty_list(mock_parse):
    mock_parse.return_value = INVALID_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    assert articles == []


@pytest.mark.integration
def test_fetch_live_techcrunch_feed():
    articles = RSSAdapter(
        "https://feeds.feedburner.com/TechCrunch", "techcrunch"
    ).fetch(limit=10)

    assert len(articles) >= 5
    assert all(article.source == "techcrunch" for article in articles)
    assert all(article.url.startswith("http") for article in articles)
    assert all(article.title for article in articles)
