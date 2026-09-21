"""Per-user digest email theme, format, font, and summary style options."""

from __future__ import annotations

from typing import Any

DIGEST_THEMES: dict[str, str] = {
    "cyan": "Skim Dark  -  cyan accents on near-black (brand default)",
    "classic": "Classic Light  -  clean white card layout",
    "minimal": "Minimal  -  text-first, low visual noise",
    "rose": "Rose  -  warm rose & pink accents on deep black",
    "amber": "Amber  -  gold accents on dark slate",
    "violet": "Violet  -  lavender accents on deep indigo",
    "slate": "Slate  -  monochrome, ultra-clean",
}

DIGEST_FORMATS: dict[str, str] = {
    "full": "Full  -  takeaways, insights, and summaries",
    "brief": "Brief  -  headlines and key takeaways only",
    "headlines": "Headlines  -  titles and links only",
}

DIGEST_FONT_STYLES: dict[str, str] = {
    "sans": "Sans-serif  -  Inter, system-ui (clean & modern)",
    "serif": "Serif  -  Georgia, Times (editorial & newspaper)",
    "mono": "Monospace  -  Courier New (technical & minimal)",
}

DIGEST_SUMMARY_STYLES: dict[str, str] = {
    "prose": "Prose  -  flowing paragraph (no extra LLM call)",
    "bullet_points": "Bullet Points  -  3 key bullets via batched LLM",
    "card": "Card  -  compact info-card layout (no extra LLM call)",
}

# CSS font-family stacks for each font_style option (used in templates)
FONT_FAMILY_MAP: dict[str, str] = {
    "sans": "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "serif": "Georgia, 'Times New Roman', Times, serif",
    "mono": "'Courier New', Courier, 'Lucida Console', monospace",
}

DEFAULT_THEME = "cyan"
DEFAULT_FORMAT = "full"
DEFAULT_MAX_STORIES = 8
DEFAULT_FONT_STYLE = "sans"
DEFAULT_SUMMARY_STYLE = "prose"
MIN_STORIES = 3
MAX_STORIES = 12

THEME_TEMPLATE: dict[str, str] = {
    "cyan": "digest_cyan.html",
    "classic": "digest.html",
    "minimal": "digest_minimal.html",
    "rose": "digest_rose.html",
    "amber": "digest_amber.html",
    "violet": "digest_violet.html",
    "slate": "digest_slate.html",
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


def normalize_font_style(font_style: str | None) -> str:
    if font_style and font_style in DIGEST_FONT_STYLES:
        return font_style
    return DEFAULT_FONT_STYLE


def normalize_summary_style(summary_style: str | None) -> str:
    if summary_style and summary_style in DIGEST_SUMMARY_STYLES:
        return summary_style
    return DEFAULT_SUMMARY_STYLE


def get_font_family(font_style: str | None) -> str:
    """Return the CSS font-family string for the given font_style key."""
    normalized = normalize_font_style(font_style)
    return FONT_FAMILY_MAP[normalized]


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
    return filtered[: normalize_max_stories(max_stories)]


def subscriber_defaults(email: str) -> dict[str, Any]:
    return {
        "email": email,
        "theme": DEFAULT_THEME,
        "format": DEFAULT_FORMAT,
        "max_stories": DEFAULT_MAX_STORIES,
        "topic_filters": None,
        "font_style": DEFAULT_FONT_STYLE,
        "summary_style": DEFAULT_SUMMARY_STYLE,
    }
