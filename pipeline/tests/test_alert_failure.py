from unittest.mock import patch

import pytest

from pipeline.alert_failure import build_failure_alert_html, send_failure_alert


def test_build_failure_alert_html_includes_workflow_and_time():
    html = build_failure_alert_html(
        when=__import__("datetime").datetime(
            2026, 8, 30, 12, 0, tzinfo=__import__("datetime").timezone.utc
        ),
        workflow="Daily Digest",
        run_url=None,
    )

    assert "Skim pipeline failed" in html
    assert "Daily Digest" in html
    assert "2026-08-30 12:00 UTC" in html
    assert "GitHub Actions logs" in html


def test_build_failure_alert_html_includes_run_link():
    html = build_failure_alert_html(
        run_url="https://github.com/org/repo/actions/runs/123",
    )

    assert 'href="https://github.com/org/repo/actions/runs/123"' in html
    assert "View GitHub Actions logs" in html


def test_build_failure_alert_html_uses_github_env(monkeypatch):
    monkeypatch.setenv("GITHUB_SERVER_URL", "https://github.com")
    monkeypatch.setenv("GITHUB_REPOSITORY", "Ssaammmmiitt/Skim")
    monkeypatch.setenv("GITHUB_RUN_ID", "999")

    html = build_failure_alert_html(run_url=None)

    assert "https://github.com/Ssaammmmiitt/Skim/actions/runs/999" in html


def test_send_failure_alert_delegates_to_mailtrap():
    with patch(
        "pipeline.alert_failure.send_alert_email", return_value=True
    ) as mock_send:
        assert send_failure_alert() is True

    mock_send.assert_called_once()
    assert mock_send.call_args.kwargs["subject"] == "Skim pipeline failed"
    assert "Skim pipeline failed" in mock_send.call_args.kwargs["html"]


def test_send_failure_alert_returns_false_on_send_error():
    with patch("pipeline.alert_failure.send_alert_email", return_value=False):
        assert send_failure_alert() is False


def test_main_exits_nonzero_when_alert_fails():
    with patch("pipeline.alert_failure.send_failure_alert", return_value=False):
        with pytest.raises(SystemExit) as exc:
            from pipeline.alert_failure import main

            main()
        assert exc.value.code == 1
