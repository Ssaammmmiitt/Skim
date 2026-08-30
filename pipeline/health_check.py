"""Pipeline health monitoring for daily operations (Phase 5.6)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta

from pipeline.config import configure_logging
from pipeline.db import (
    count_articles_created_on,
    count_duplicate_article_urls,
    count_total_articles,
    get_recent_digests,
    get_recent_pipeline_runs,
)

logger = logging.getLogger(__name__)

DEFAULT_LOOKBACK_DAYS = 7


@dataclass
class HealthReport:
    healthy: bool = True
    issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    pipeline_runs: list[dict] = field(default_factory=list)
    digests: list[dict] = field(default_factory=list)
    total_articles: int = 0
    articles_today: int = 0
    duplicate_urls: int = 0

    def add_issue(self, message: str) -> None:
        self.issues.append(message)
        self.healthy = False

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)


def build_health_report(lookback_days: int = DEFAULT_LOOKBACK_DAYS) -> HealthReport:
    report = HealthReport()
    today = date.today()
    report.pipeline_runs = get_recent_pipeline_runs(limit=lookback_days)
    report.digests = get_recent_digests(limit=lookback_days)
    report.total_articles = count_total_articles()
    report.articles_today = count_articles_created_on(today)
    report.duplicate_urls = count_duplicate_article_urls()

    if not report.pipeline_runs:
        report.add_issue("No pipeline runs recorded in the database")
        return report

    for run in report.pipeline_runs:
        if run.get("status") == "failed":
            report.add_issue(
                f"Pipeline run on {run['run_date']} failed"
                + (f": {run.get('error_message')}" if run.get("error_message") else "")
            )
        elif run.get("status") == "partial":
            report.add_warning(f"Pipeline run on {run['run_date']} completed with partial success")
        elif run.get("status") == "running":
            report.add_warning(f"Pipeline run on {run['run_date']} is still marked running")

    recent_run_dates = {run["run_date"] for run in report.pipeline_runs}
    for offset in range(lookback_days):
        day = today - timedelta(days=offset)
        if day not in recent_run_dates:
            report.add_warning(f"No pipeline run recorded for {day.isoformat()}")

    digest_dates = {digest["digest_date"] for digest in report.digests}
    for run in report.pipeline_runs:
        if run.get("digest_sent") and run["run_date"] not in digest_dates:
            report.add_warning(
                f"Run on {run['run_date']} marked digest_sent but no digests row found"
            )

    if report.duplicate_urls:
        report.add_issue(f"Found {report.duplicate_urls} duplicate article URLs")

    if report.articles_today == 0:
        report.add_warning(f"No articles ingested today ({today.isoformat()})")

    return report


def format_health_report(report: HealthReport) -> str:
    lines = ["Skim pipeline health report", ""]

    if report.pipeline_runs:
        lines.append("Recent pipeline runs:")
        for run in report.pipeline_runs:
            duration = run.get("duration_seconds")
            duration_text = f"{duration:.0f}s" if duration is not None else "n/a"
            lines.append(
                f"  - {run['run_date']}: {run['status']} "
                f"(ingested={run.get('articles_ingested', 0)}, "
                f"embedded={run.get('articles_embedded', 0)}, "
                f"digest_sent={run.get('digest_sent', False)}, "
                f"duration={duration_text})"
            )
        lines.append("")

    if report.digests:
        lines.append("Recent digests:")
        for digest in report.digests:
            lines.append(
                f"  - {digest['digest_date']}: {digest.get('story_count', 0)} stories"
            )
        lines.append("")

    lines.extend(
        [
            f"Total articles: {report.total_articles}",
            f"Articles ingested today: {report.articles_today}",
            f"Duplicate URLs: {report.duplicate_urls}",
            "",
        ]
    )

    if report.warnings:
        lines.append("Warnings:")
        lines.extend(f"  - {warning}" for warning in report.warnings)
        lines.append("")

    if report.issues:
        lines.append("Issues:")
        lines.extend(f"  - {issue}" for issue in report.issues)
        lines.append("")
    else:
        lines.append("Status: healthy")

    return "\n".join(lines)


def run_health_check(lookback_days: int = DEFAULT_LOOKBACK_DAYS) -> HealthReport:
    report = build_health_report(lookback_days=lookback_days)
    output = format_health_report(report)
    if report.healthy:
        logger.info("\n%s", output)
    else:
        logger.error("\n%s", output)
    return report


def main() -> None:
    configure_logging()
    report = run_health_check()
    if not report.healthy:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
