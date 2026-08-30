"""HTML digest composition via Jinja2."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"

TOPIC_LABELS: dict[str, str] = {
    "ai_ml": "AI/ML",
    "web_dev": "Web Dev",
    "cloud_infra": "Cloud",
    "cybersecurity": "Security",
    "startups": "Startups",
    "programming": "Programming",
    "science": "Science",
    "other": "Other",
}


def _prepare_stories(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    stories: list[dict[str, Any]] = []
    for rank, article in enumerate(articles, start=1):
        topic = article.get("topic") or "other"
        stories.append(
            {
                **article,
                "rank": rank,
                "topic_label": TOPIC_LABELS.get(topic, str(topic).replace("_", " ").title()),
            }
        )
    return stories


def _topics_summary(articles: list[dict[str, Any]]) -> str:
    counts: dict[str, int] = {}
    for article in articles:
        topic = article.get("topic") or "other"
        label = TOPIC_LABELS.get(topic, topic)
        counts[label] = counts.get(label, 0) + 1
    return ", ".join(f"{label} ({count})" for label, count in counts.items())


def compose_digest(
    articles: list[dict[str, Any]],
    stats: dict[str, Any] | None = None,
    rationale: str = "",
    digest_date: datetime | None = None,
) -> str:
    """Render the daily digest as email-safe HTML."""
    when = digest_date or datetime.now(timezone.utc)
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("digest.html")
    stories = _prepare_stories(articles)

    return template.render(
        date=when.strftime("%B %d, %Y"),
        stories=stories,
        story_count=len(stories),
        rationale=rationale.strip(),
        topics_summary=_topics_summary(articles) if articles else "",
        stats=stats or {},
    )
