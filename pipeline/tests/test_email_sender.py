from unittest.mock import MagicMock, patch

import pytest
import requests

from pipeline.email_sender import (
    PRODUCTION_API_URL,
    SANDBOX_API_URL,
    send_digest_email,
    send_email,
)


@pytest.fixture
def mail_env(monkeypatch):
    monkeypatch.setenv("MAILTRAP_API_TOKEN", "test-token")
    monkeypatch.setenv("MAILTRAP_SENDER_EMAIL", "skim@example.com")
    monkeypatch.setenv("MAILTRAP_SENDER_NAME", "Skim")
    monkeypatch.setenv("DIGEST_RECIPIENT", "reader@example.com")


def test_send_email_success(mail_env):
    response = MagicMock()
    response.raise_for_status.return_value = None
    session = MagicMock()
    session.post.return_value = response

    assert send_email(subject="Test", html="<p>Hi</p>", session=session) is True
    session.post.assert_called_once()
    call_kwargs = session.post.call_args.kwargs
    assert call_kwargs["json"]["subject"] == "Test"
    assert call_kwargs["json"]["to"] == [{"email": "reader@example.com"}]
    assert call_kwargs["headers"]["Authorization"] == "Bearer test-token"


def test_send_email_failure_returns_false(mail_env, monkeypatch):
    monkeypatch.setattr("pipeline.resilience.time.sleep", lambda seconds: None)
    session = MagicMock()
    session.post.side_effect = requests.HTTPError("API error")

    assert send_email(subject="Test", html="<p>Hi</p>", session=session) is False
    assert session.post.call_count == 3


def test_send_digest_email_delegates_to_send_email(mail_env):
    with patch("pipeline.email_sender.send_email", return_value=True) as mock_send:
        assert send_digest_email("<p>Digest</p>", "Skim — Today") is True
    mock_send.assert_called_once_with(subject="Skim — Today", html="<p>Digest</p>")


def test_send_email_uses_production_url(mail_env, monkeypatch):
    monkeypatch.delenv("MAILTRAP_SANDBOX", raising=False)
    response = MagicMock()
    session = MagicMock()
    session.post.return_value = response

    send_email(subject="Test", html="<p>Hi</p>", session=session)
    assert session.post.call_args.args[0] == PRODUCTION_API_URL


def test_send_email_uses_sandbox_url(mail_env, monkeypatch):
    monkeypatch.setenv("MAILTRAP_SANDBOX", "true")
    monkeypatch.setenv("MAILTRAP_INBOX_ID", "4242")
    response = MagicMock()
    session = MagicMock()
    session.post.return_value = response

    send_email(subject="Test", html="<p>Hi</p>", session=session)
    assert session.post.call_args.args[0] == SANDBOX_API_URL


def test_send_email_missing_token(monkeypatch):
    monkeypatch.delenv("MAILTRAP_API_TOKEN", raising=False)
    with pytest.raises(ValueError, match="MAILTRAP_API_TOKEN"):
        send_email(subject="Test", html="<p>Hi</p>", session=MagicMock())
