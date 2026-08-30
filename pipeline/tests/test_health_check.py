from datetime import date
from unittest.mock import patch

from pipeline.health_check import build_health_report, format_health_report, run_health_check


def _sample_run(run_date: date, status: str = "success", digest_sent: bool = True) -> dict:
    return {
        "run_date": run_date,
        "status": status,
        "articles_ingested": 10,
        "articles_embedded": 10,
        "digest_sent": digest_sent,
        "duration_seconds": 120.0,
        "error_message": None,
    }


@patch("pipeline.health_check.count_duplicate_article_urls", return_value=0)
@patch("pipeline.health_check.count_articles_created_on", return_value=5)
@patch("pipeline.health_check.count_total_articles", return_value=100)
@patch("pipeline.health_check.get_recent_digests")
@patch("pipeline.health_check.get_recent_pipeline_runs")
def test_build_health_report_healthy(
    mock_runs, mock_digests, _total, _today, _dupes
):
    today = date(2026, 8, 30)
    mock_runs.return_value = [_sample_run(today)]
    mock_digests.return_value = [
        {"digest_date": today, "story_count": 8, "subject": "Skim", "sent_at": None}
    ]

    with patch("pipeline.health_check.date") as mock_date:
        mock_date.today.return_value = today
        report = build_health_report(lookback_days=1)

    assert report.healthy
    assert report.total_articles == 100
    assert report.articles_today == 5
    assert not report.issues


@patch("pipeline.health_check.count_duplicate_article_urls", return_value=2)
@patch("pipeline.health_check.count_articles_created_on", return_value=0)
@patch("pipeline.health_check.count_total_articles", return_value=50)
@patch("pipeline.health_check.get_recent_digests", return_value=[])
@patch("pipeline.health_check.get_recent_pipeline_runs")
def test_build_health_report_flags_failures_and_warnings(mock_runs, *_rest):
    today = date(2026, 8, 30)
    mock_runs.return_value = [
        {
            "run_date": today,
            "status": "failed",
            "articles_ingested": 0,
            "articles_embedded": 0,
            "digest_sent": False,
            "duration_seconds": 30.0,
            "error_message": "ingest timeout",
        }
    ]

    with patch("pipeline.health_check.date") as mock_date:
        mock_date.today.return_value = today
        report = build_health_report(lookback_days=1)

    assert not report.healthy
    assert any("failed" in issue for issue in report.issues)
    assert any("duplicate" in issue.lower() for issue in report.issues)
    assert any("No articles ingested today" in warning for warning in report.warnings)


def test_format_health_report_includes_summary():
    today = date(2026, 8, 30)
    from pipeline.health_check import HealthReport

    text = format_health_report(
        HealthReport(
            healthy=True,
            pipeline_runs=[_sample_run(today)],
            digests=[{"digest_date": today, "story_count": 8}],
            total_articles=42,
            articles_today=3,
            duplicate_urls=0,
        )
    )

    assert "Total articles: 42" in text
    assert "Status: healthy" in text
    assert "2026-08-30" in text


@patch("pipeline.health_check.build_health_report")
def test_run_health_check_exits_nonzero_on_issues(mock_build):
    from pipeline.health_check import HealthReport

    mock_build.return_value = HealthReport(healthy=False, issues=["boom"])
    report = run_health_check()
    assert report.healthy is False
