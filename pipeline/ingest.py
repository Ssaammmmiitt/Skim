import logging

from pipeline.config import RSS_SOURCES
from pipeline.db import get_todays_new_articles, insert_articles
from pipeline.sources.hackernews import HackerNewsAdapter
from pipeline.sources.rss import RSSAdapter

logger = logging.getLogger(__name__)


def _build_adapters():
    return [
        HackerNewsAdapter(),
        *[RSSAdapter(source["url"], source["name"]) for source in RSS_SOURCES],
    ]


def ingest_all_sources(limit: int = 30) -> list[dict]:
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
    logger.info(
        "Stored %d new articles (of %d fetched)", new_count, len(all_articles)
    )
    return get_todays_new_articles()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    ingest_all_sources()
