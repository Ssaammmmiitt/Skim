"""Skim pipeline entry point: ingest → embed → reason → compose → send."""

from __future__ import annotations

import logging
import time
from datetime import date, datetime, timezone

from pipeline.compose import compose_digest
from pipeline.config import configure_logging
from pipeline.db import (
    digest_already_sent,
    mark_articles_digest_date,
    record_digest_sent,
    record_pipeline_complete,
    record_pipeline_start,
)
from pipeline.degradation import select_digest_articles
from pipeline.email_sender import send_digest_email
from pipeline.embed import embed_all_articles
from pipeline.ingest import ingest_all_sources

logger = logging.getLogger(__name__)


def run_pipeline() -> None:
    start = time.time()
    run_date = date.today()
    run_id: int | None = None

    if digest_already_sent(run_date):
        logger.info("Digest already sent for %s. Exiting.", run_date)
        return

    run_id = record_pipeline_start(run_date)
    articles_ingested = 0
    articles_embedded = 0
    digest_sent = False
    degraded = False

    logger.info("Starting Skim pipeline for %s", run_date)

    try:
        new_articles = ingest_all_sources()
        articles_ingested = len(new_articles)

        try:
            articles_embedded = embed_all_articles(batch_size=100)
        except Exception as exc:
            logger.warning(
                "Embedding failed (%s). Continuing without new embeddings.", exc
            )
            articles_embedded = 0

        digest_articles, rationale, degraded = select_digest_articles(new_articles)
        if degraded and digest_articles:
            logger.warning(
                "Sending degraded digest with %d stories (no agent insights)",
                len(digest_articles),
            )
        elif not digest_articles:
            logger.info("No stories selected — sending quiet-day digest")

        duration_seconds = round(time.time() - start)
        stats = {
            "articles_ingested": articles_ingested,
            "articles_embedded": articles_embedded,
            "duration_seconds": duration_seconds,
            "degraded": degraded,
        }

        html = compose_digest(
            digest_articles,
            stats=stats,
            rationale=rationale,
            digest_date=datetime.now(timezone.utc),
        )

        date_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
        subject = f"Skim — {date_str}"

        if send_digest_email(html, subject):
            article_ids = [article["id"] for article in digest_articles]
            record_digest_sent(run_date, article_ids, subject)
            mark_articles_digest_date(article_ids, run_date)
            digest_sent = True
            logger.info(
                "Digest sent with %d stories for %s%s",
                len(digest_articles),
                run_date,
                " (degraded)" if degraded else "",
            )
        else:
            logger.error("Digest email was not sent — not recording digest row")

        status = "success" if digest_sent else "partial"
        if digest_sent and degraded:
            status = "partial"

        record_pipeline_complete(
            run_id,
            status=status,
            articles_ingested=articles_ingested,
            articles_embedded=articles_embedded,
            digest_sent=digest_sent,
            duration_seconds=round(time.time() - start),
        )

    except Exception as exc:
        logger.exception("Pipeline failed: %s", exc)
        if run_id is not None:
            record_pipeline_complete(
                run_id,
                status="failed",
                articles_ingested=articles_ingested,
                articles_embedded=articles_embedded,
                digest_sent=digest_sent,
                duration_seconds=round(time.time() - start),
                error=str(exc),
            )
        raise


if __name__ == "__main__":
    configure_logging()
    run_pipeline()
