from unittest.mock import MagicMock, patch

from pipeline.db import insert_articles
from pipeline.models import Article
from pipeline.sources.base import normalize_url


def test_normalize_strips_tracking_params_and_www():
    assert (
        normalize_url("https://www.example.com/article?utm_source=twitter&ref=home")
        == "https://example.com/article"
    )


def test_normalize_lowercases_host():
    assert normalize_url("https://Example.COM/path/") == "https://example.com/path/"


def test_normalize_resolves_duplicate_hn_links():
    url_a = "https://www.example.com/story?utm_source=hackernews"
    url_b = "https://example.com/story?ref=home"

    assert normalize_url(url_a) == normalize_url(url_b)


def test_normalize_preserves_non_tracking_query_params():
    assert (
        normalize_url("https://example.com/article?page=2&sort=desc")
        == "https://example.com/article?page=2&sort=desc"
    )


def test_normalize_strips_source_param():
    assert (
        normalize_url("https://example.com/post?source=newsletter")
        == "https://example.com/post"
    )


def test_normalize_strips_multiple_utm_params():
    assert (
        normalize_url(
            "https://example.com/x?utm_campaign=spring&utm_medium=email&id=42"
        )
        == "https://example.com/x?id=42"
    )


def test_insert_articles_returns_zero_for_empty_list():
    assert insert_articles([]) == 0


@patch("pipeline.db.get_connection")
def test_insert_articles_counts_only_rows_returned_by_insert(mock_get_connection):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    # First insert succeeds, second is a duplicate (ON CONFLICT DO NOTHING).
    mock_cursor.fetchone.side_effect = [(101,), None]

    articles = [
        Article(
            title="New story",
            url="https://example.com/new",
            source="test",
        ),
        Article(
            title="Duplicate story",
            url="https://example.com/dup",
            source="test",
        ),
    ]

    assert insert_articles(articles) == 1
    assert mock_cursor.execute.call_count == 2
    mock_conn.commit.assert_called_once()
