"""Unit tests for digest idempotency guards (no database required)."""

from datetime import date
from unittest.mock import MagicMock, patch

from pipeline.db import digest_already_sent, record_digest_sent


@patch("pipeline.db.get_connection")
def test_digest_already_sent_returns_true_when_row_exists(mock_get_connection):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = (1,)

    assert digest_already_sent(date(2026, 8, 31)) is True

    mock_cursor.execute.assert_called_once()
    sql, params = mock_cursor.execute.call_args[0]
    assert "digests" in sql
    assert params == (date(2026, 8, 31),)
    mock_conn.close.assert_called_once()


@patch("pipeline.db.get_connection")
def test_digest_already_sent_returns_false_when_missing(mock_get_connection):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None

    assert digest_already_sent(date(2026, 8, 31)) is False


@patch("pipeline.db.get_connection")
def test_record_digest_sent_inserts_with_on_conflict(mock_get_connection):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    digest_date = date(2026, 8, 31)
    article_ids = [10, 20, 30]
    record_digest_sent(digest_date, article_ids, "Skim — Aug 31, 2026")

    mock_cursor.execute.assert_called_once()
    sql, params = mock_cursor.execute.call_args[0]
    assert "ON CONFLICT (digest_date) DO NOTHING" in sql
    assert params == (digest_date, article_ids, 3, "Skim — Aug 31, 2026")
    mock_conn.commit.assert_called_once()
    mock_conn.close.assert_called_once()
