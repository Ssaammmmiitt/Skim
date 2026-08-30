"""Send a pipeline failure alert email (used by GitHub Actions on job failure)."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from pipeline.config import configure_logging
from pipeline.email_sender import send_alert_email

logger = logging.getLogger(__name__)


def _github_run_url() -> str | None:
    server = os.environ.get("GITHUB_SERVER_URL", "").rstrip("/")
    repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
    run_id = os.environ.get("GITHUB_RUN_ID", "").strip()
    if server and repository and run_id:
        return f"{server}/{repository}/actions/runs/{run_id}"
    return None


def build_failure_alert_html(
    *,
    when: datetime | None = None,
    workflow: str | None = None,
    run_url: str | None = None,
) -> str:
    timestamp = (when or datetime.now(timezone.utc)).strftime("%Y-%m-%d %H:%M UTC")
    workflow_name = workflow or os.environ.get("GITHUB_WORKFLOW", "Daily Digest")
    logs_link = run_url or _github_run_url()

    logs_section = (
        f'<p><a href="{logs_link}">View GitHub Actions logs</a></p>'
        if logs_link
        else "<p>Check your GitHub Actions logs for this workflow run.</p>"
    )

    return f"""\
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; line-height: 1.5;">
  <h2 style="margin: 0 0 12px;">Skim pipeline failed</h2>
  <p>The daily Skim pipeline did not complete successfully.</p>
  <ul>
    <li><strong>Workflow:</strong> {workflow_name}</li>
    <li><strong>Time:</strong> {timestamp}</li>
  </ul>
  {logs_section}
  <p style="color: #666; font-size: 14px;">No digest email was sent for this run.</p>
</div>
"""


def send_failure_alert() -> bool:
    """Send a failure alert to DIGEST_RECIPIENT. Returns True on success."""
    subject = "Skim pipeline failed"
    html = build_failure_alert_html()
    sent = send_alert_email(subject=subject, html=html)
    if sent:
        logger.info("Failure alert sent")
    else:
        logger.error("Failure alert could not be sent")
    return sent


def main() -> None:
    configure_logging()
    if not send_failure_alert():
        raise SystemExit(1)


if __name__ == "__main__":
    main()
