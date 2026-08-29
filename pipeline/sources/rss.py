from datetime import datetime, timezone
from time import struct_time

import feedparser

from pipeline.config import USER_AGENT
from pipeline.models import Article
from pipeline.sources.base import SourceAdapter


class RSSAdapter(SourceAdapter):
    def __init__(self, feed_url: str, source_name: str):
        self.feed_url = feed_url
        self.name = source_name

    def fetch(self, limit: int = 30) -> list[Article]:
        feed = feedparser.parse(
            self.feed_url, request_headers={"User-Agent": USER_AGENT}
        )
        entries = getattr(feed, "entries", []) or []

        articles = []
        for entry in entries[:limit]:
            url = entry.get("link", "")
            articles.append(
                Article(
                    title=entry.get("title", "Untitled"),
                    url=self._normalize_url(url) if url else "",
                    source=self.name,
                    published_at=self._parse_date(entry),
                    summary=self._extract_summary(entry),
                )
            )
        return [article for article in articles if article.url]

    def _parse_date(self, entry: feedparser.FeedParserDict) -> datetime | None:
        parsed: struct_time | None = entry.get("published_parsed") or entry.get(
            "updated_parsed"
        )
        if not parsed:
            return None
        return datetime(
            parsed.tm_year,
            parsed.tm_mon,
            parsed.tm_mday,
            parsed.tm_hour,
            parsed.tm_min,
            parsed.tm_sec,
            tzinfo=timezone.utc,
        )

    def _extract_summary(self, entry: feedparser.FeedParserDict) -> str | None:
        summary = entry.get("summary") or entry.get("description")
        if not summary:
            return None
        return summary.strip()
