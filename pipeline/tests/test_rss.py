from pathlib import Path
from unittest.mock import patch

import feedparser
import pytest

from pipeline.config import SUMMARY_MAX_CHARS
from pipeline.sources.rss import RSSAdapter

FIXTURES = Path(__file__).parent / "fixtures"
FULL_FEED = feedparser.parse((FIXTURES / "sample_rss.xml").read_text())
SPARSE_FEED = feedparser.parse((FIXTURES / "sample_rss_sparse.xml").read_text())
HTML_FEED = feedparser.parse((FIXTURES / "sample_rss_html.xml").read_text())
INVALID_FEED = feedparser.parse("this is not valid xml")

_LONG_BODY = "<p>" + " ".join(["word"] * 1000) + "</p>"
LONG_FEED = feedparser.parse(
    "<?xml version='1.0'?><rss version='2.0'><channel><item>"
    "<title>Long</title><link>https://example.com/long</link>"
    f"<description><![CDATA[{_LONG_BODY}]]></description>"
    "</item></channel></rss>"
)


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
def test_fetch_strips_html_from_summary(mock_parse):
    mock_parse.return_value = HTML_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    summary = articles[0].summary
    assert summary == "Headline First paragraph. Second paragraph with a link ."
    assert "<" not in summary
    assert "  " not in summary


@patch("pipeline.sources.rss.feedparser.parse")
def test_fetch_returns_none_when_summary_is_markup_only(mock_parse):
    mock_parse.return_value = HTML_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    assert articles[1].summary is None


@patch("pipeline.sources.rss.feedparser.parse")
def test_fetch_truncates_long_summary(mock_parse):
    mock_parse.return_value = LONG_FEED

    articles = RSSAdapter("https://example.com/feed.xml", "testfeed").fetch()

    assert len(articles[0].summary) <= SUMMARY_MAX_CHARS
    assert articles[0].summary.endswith("word")


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
