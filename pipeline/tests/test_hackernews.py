import json
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from pipeline.sources.hackernews import HackerNewsAdapter

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture(name: str):
    return json.loads((FIXTURES / name).read_text())


def _mock_response(payload):
    response = Mock()
    response.raise_for_status = Mock()
    response.json.return_value = payload
    return response


@patch("pipeline.sources.hackernews.requests.get")
def test_fetch_returns_normalized_articles(mock_get):
    mock_get.side_effect = [
        _mock_response(_load_fixture("hn_topstories.json")),
        _mock_response(_load_fixture("hn_item_with_url.json")),
        _mock_response(_load_fixture("hn_item_without_url.json")),
        _mock_response(
            {
                "id": 102,
                "title": "Second article",
                "url": "https://Example.COM/path/",
                "time": 1700000200,
                "type": "story",
            }
        ),
    ]

    articles = HackerNewsAdapter().fetch(limit=3)

    assert len(articles) == 2
    assert articles[0].title == "Example article"
    assert articles[0].url == "https://example.com/article"
    assert articles[0].source == "hackernews"
    assert articles[0].summary == "Example article"
    assert articles[0].published_at is not None
    assert articles[1].url == "https://example.com/path/"


@patch("pipeline.sources.hackernews.requests.get")
def test_fetch_skips_stories_without_url(mock_get):
    mock_get.side_effect = [
        _mock_response([201]),
        _mock_response(_load_fixture("hn_item_without_url.json")),
    ]

    articles = HackerNewsAdapter().fetch(limit=1)

    assert articles == []


@pytest.mark.integration
def test_fetch_live_api_returns_articles_with_urls():
    articles = HackerNewsAdapter().fetch(limit=30)

    assert len(articles) >= 10
    assert all(article.url.startswith("http") for article in articles)
    assert all(article.source == "hackernews" for article in articles)
