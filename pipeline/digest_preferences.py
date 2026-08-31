"""Per-user digest email theme and format options."""

from __future__ import annotations

from typing import Any

DIGEST_THEMES: dict[str, str] = {
    "cyan": "Skim Dark  -  cyan accents on near-black (brand default)",
    "classic": "Classic Light  -  clean white card layout",
    "minimal": "Minimal  -  text-first, low visual noise",
}

DIGEST_FORMATS: dict[str, str] = {
    "full": "Full  -  takeaways, insights, and summaries",
    "brief": "Brief  -  headlines and key takeaways only",
    "headlines": "Headlines  -  titles and links only",
}

DEFAULT_THEME = "cyan"
DEFAULT_FORMAT = "full"
DEFAULT_MAX_STORIES = 8
MIN_STORIES = 3
MAX_STORIES = 12

THEME_TEMPLATE: dict[str, str] = {
    "cyan": "digest_cyan.html",
    "classic": "digest.html",
    "minimal": "digest_minimal.html",
}


def normalize_theme(theme: str | None) -> str:
    if theme and theme in DIGEST_THEMES:
        return theme
    return DEFAULT_THEME


def normalize_format(format_name: str | None) -> str:
    if format_name and format_name in DIGEST_FORMATS:
        return format_name
    return DEFAULT_FORMAT


def normalize_max_stories(value: int | None) -> int:
    if value is None:
        return DEFAULT_MAX_STORIES
    return max(MIN_STORIES, min(MAX_STORIES, value))


def format_flags(format_name: str) -> dict[str, bool]:
    normalized = normalize_format(format_name)
    return {
        "show_takeaways": normalized in {"full", "brief"},
        "show_insights": normalized == "full",
        "show_summaries": normalized == "full",
        "show_read_more": normalized in {"full", "brief"},
        "show_rationale": normalized == "full",
        "show_stats_footer": normalized == "full",
    }


def filter_articles_for_user(
    articles: list[dict[str, Any]],
    *,
    topic_filters: list[str] | None,
    max_stories: int,
) -> list[dict[str, Any]]:
    filtered = articles
    if topic_filters:
        allowed = set(topic_filters)
        filtered = [article for article in filtered if article.get("topic") in allowed]
    return filtered[:normalize_max_stories(max_stories)]


def subscriber_defaults(email: str) -> dict[str, Any]:
    return {
        "email": email,
        "theme": DEFAULT_THEME,
        "format": DEFAULT_FORMAT,
        "max_stories": DEFAULT_MAX_STORIES,
        "topic_filters": None,
    }
