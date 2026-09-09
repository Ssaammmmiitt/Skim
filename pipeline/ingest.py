from __future__ import annotations

import logging
from typing import Any

from pipeline.config import RSS_SOURCES, configure_logging
from pipeline.db import get_todays_new_articles, insert_articles, get_articles_by_urls
from pipeline.sources.base import SourceAdapter
from pipeline.sources.hackernews import HackerNewsAdapter
from pipeline.sources.devto import DevToAdapter
from pipeline.sources.lobsters import LobstersAdapter
from pipeline.sources.rss import RSSAdapter
from pipeline.sources.extractor import enrich_articles

logger = logging.getLogger(__name__)


def is_likely_english(text: str) -> bool:
    """Simple heuristic to filter out non-English content."""
    if not text:
        return True
    # If more than 30% of characters are non-ASCII, it's likely not English
    non_ascii_count = sum(1 for char in text if ord(char) > 127)
    return (non_ascii_count / len(text)) < 0.3


def _build_adapters() -> list[SourceAdapter]:
    return [
        HackerNewsAdapter(),
        DevToAdapter(),
        LobstersAdapter(),
        *[RSSAdapter(source["url"], source["name"]) for source in RSS_SOURCES],
    ]


def ingest_all_sources(limit: int = 30) -> list[dict[str, Any]]:
    adapters = _build_adapters()
    all_articles = []

    # 1. Discover
    for adapter in adapters:
        try:
            articles = adapter.fetch(limit=limit)
            all_articles.extend(articles)
            logger.info("%s: fetched %d articles", adapter.name, len(articles))
        except Exception as exc:
            logger.warning("%s FAILED: %s", adapter.name, exc)

    if not all_articles:
        logger.info("No articles fetched from any source.")
        return []

    # 2. Filter (English-only & Deduplication against DB)
    english_articles = [a for a in all_articles if is_likely_english(a.title) and is_likely_english(a.summary)]
    if len(all_articles) != len(english_articles):
        logger.info("Filtered %d non-English/spam articles", len(all_articles) - len(english_articles))
    all_articles = english_articles

    urls = [str(a.url) for a in all_articles]
    existing_articles = get_articles_by_urls(urls)
    existing_urls = {row["url"] for row in existing_articles}

    new_articles = []
    seen_urls = set()
    for a in all_articles:
        url_str = str(a.url)
        if url_str not in existing_urls and url_str not in seen_urls:
            new_articles.append(a)
            seen_urls.add(url_str)

    logger.info("Found %d new articles to process (out of %d fetched)", len(new_articles), len(all_articles))

    # 3. Extract (Enrich with Trafilatura/BS4/OG)
    if new_articles:
        enrich_articles(new_articles)

        # 4. Insert
        new_count = insert_articles(new_articles)
        logger.info("Stored %d new articles", new_count)
    else:
        logger.info("No new articles to store.")
        
    return get_todays_new_articles()


if __name__ == "__main__":
    configure_logging()
    ingest_all_sources()
