"""HTML digest composition via Jinja2."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from pipeline.digest_preferences import (
    DEFAULT_FORMAT,
    DEFAULT_THEME,
    DEFAULT_FONT_STYLE,
    DEFAULT_SUMMARY_STYLE,
    THEME_TEMPLATE,
    filter_articles_for_user,
    format_flags,
    get_font_family,
    normalize_format,
    normalize_theme,
    normalize_font_style,
    normalize_summary_style,
)
from pipeline.summary_style import apply_summary_style

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
                "topic_label": TOPIC_LABELS.get(
                    topic, str(topic).replace("_", " ").title()
                ),
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
    *,
    theme: str | None = None,
    format_name: str | None = None,
    topic_filters: list[str] | None = None,
    max_stories: int | None = None,
    font_style: str | None = None,
    summary_style: str | None = None,
    llm_client: Any | None = None,
) -> str:
    """Render the daily digest as email-safe HTML.

    Args:
        articles:      Candidate digest articles (pre-selected by the pipeline).
        stats:         Pipeline run stats to show in footer.
        rationale:     Editor's note / agent rationale.
        digest_date:   Datetime for the date header.
        theme:         Email colour theme key (7 options).
        format_name:   Content format key ('full', 'brief', 'headlines').
        topic_filters: Topic IDs to filter articles by.
        max_stories:   Maximum number of stories to include.
        font_style:    Font stack key ('sans', 'serif', 'mono').
        summary_style: Summary style key ('prose', 'bullet_points', 'card').
        llm_client:    LLM client required when summary_style='bullet_points'.
    """
    when = digest_date or datetime.now(timezone.utc)
    resolved_theme = normalize_theme(theme or DEFAULT_THEME)
    resolved_format = normalize_format(format_name or DEFAULT_FORMAT)
    resolved_font = normalize_font_style(font_style or DEFAULT_FONT_STYLE)
    resolved_summary = normalize_summary_style(summary_style or DEFAULT_SUMMARY_STYLE)

    filtered = filter_articles_for_user(
        articles,
        topic_filters=topic_filters,
        max_stories=max_stories or 8,
    )

    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template(THEME_TEMPLATE[resolved_theme])
    stories = _prepare_stories(filtered)
    flags = format_flags(resolved_format)

    # Apply summary style post-processing (one batched LLM call for bullet_points,
    # zero extra calls for prose and card).
    stories = apply_summary_style(stories, resolved_summary, llm_client)

    font_family = get_font_family(resolved_font)

    return template.render(
        date=when.strftime("%B %d, %Y"),
        stories=stories,
        story_count=len(stories),
        rationale=rationale.strip(),
        topics_summary=_topics_summary(filtered) if filtered else "",
        stats=stats or {},
        theme=resolved_theme,
        format=resolved_format,
        font_family=font_family,
        summary_style=resolved_summary,
        **flags,
    )
