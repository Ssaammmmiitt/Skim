"""URL and text filters shared by ingest / RSS adapters."""

from __future__ import annotations

from urllib.parse import urlparse

# Paths / hosts that burn enrich+embed budget without helping a tech digest.
_JUNK_HOST_SUFFIXES = (
    "youtube.com",
    "youtu.be",
    "greasyfork.org",
)

_JUNK_PATH_FRAGMENTS = (
    "coupon-code",
    "promo-code",
    "discount-code",
    "/coupon",
    "/promo-code",
    "/discount-code",
    "affiliate",
    "deal-sale",
)

# Prefer editorial sources when we must cap classify volume under LLM pressure.
PREFERRED_CLASSIFY_SOURCES = (
    "techcrunch",
    "arstechnica",
    "theverge",
    "mit_tech_review",
    "wired",
    "bleeping_computer",
    "the_register",
    "cloudflare_blog",
    "github_blog",
    "hugging_face",
    "infoq",
    "simon_willison",
    "phoronix",
    "hackernews",
    "lobsters",
    "dev_to",
)


def looks_like_html(text: str) -> bool:
    """True when BeautifulSoup should parse; avoids MarkupResemblesLocatorWarning."""
    if not text:
        return False
    # BS warns when the string looks like a filename/path (no real markup).
    return "<" in text and ">" in text


def is_junk_url(url: str) -> bool:
    """Return True for promo/video/affiliate URLs we should skip before enrich/embed."""
    if not url:
        return True

    try:
        parsed = urlparse(url.strip())
    except ValueError:
        return True

    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]

    path = (parsed.path or "").lower()
    query = (parsed.query or "").lower()
    haystack = f"{path}?{query}"

    for suffix in _JUNK_HOST_SUFFIXES:
        if host == suffix or host.endswith("." + suffix):
            if suffix in ("youtube.com", "youtu.be"):
                return True
            if suffix == "greasyfork.org":
                return True

    for fragment in _JUNK_PATH_FRAGMENTS:
        if fragment in haystack:
            return True

    # Wired / affiliate deal pages often end with *-coupon-code style slugs.
    slug = path.rsplit("/", 1)[-1]
    if slug.endswith(("-coupon-code", "-promo-code", "-discount-code", "-coupon")):
        return True

    return False


def prioritize_for_classify(
    articles: list[dict],
    limit: int,
) -> list[dict]:
    """Stable-sort preferred sources first, then cap to *limit*."""
    if limit <= 0 or not articles:
        return []

    rank = {name: index for index, name in enumerate(PREFERRED_CLASSIFY_SOURCES)}
    sentinel = len(PREFERRED_CLASSIFY_SOURCES)

    def sort_key(article: dict) -> tuple[int, int]:
        source = str(article.get("source") or "")
        return (rank.get(source, sentinel), int(article.get("id") or 0))

    ordered = sorted(articles, key=sort_key)
    return ordered[:limit]
