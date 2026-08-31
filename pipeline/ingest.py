from __future__ import annotations

import logging
from typing import Any

from pipeline.config import RSS_SOURCES, configure_logging
from pipeline.db import get_todays_new_articles, insert_articles
from pipeline.sources.base import SourceAdapter
from pipeline.sources.hackernews import HackerNewsAdapter
from pipeline.sources.rss import RSSAdapter

logger = logging.getLogger(__name__)


def _build_adapters() -> list[SourceAdapter]:
    return [
        HackerNewsAdapter(),
        *[RSSAdapter(source["url"], source["name"]) for source in RSS_SOURCES],
    ]


def ingest_all_sources(limit: int = 30) -> list[dict[str, Any]]:
    adapters = _build_adapters()
    all_articles = []

    for adapter in adapters:
        try:
            articles = adapter.fetch(limit=limit)
            all_articles.extend(articles)
            logger.info("%s: fetched %d articles", adapter.name, len(articles))
        except Exception as exc:
            logger.warning("%s FAILED: %s", adapter.name, exc)

    new_count = insert_articles(all_articles)
    logger.info("Stored %d new articles (of %d fetched)", new_count, len(all_articles))
    return get_todays_new_articles()


if __name__ == "__main__":
    configure_logging()
    ingest_all_sources()
