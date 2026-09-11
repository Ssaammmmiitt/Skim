"""Skim pipeline entry point: ingest → embed → reason → compose → send."""

from __future__ import annotations

import argparse
import logging
import time
from datetime import date, datetime, timezone

from pipeline.compose import compose_digest
from pipeline.config import configure_logging
from pipeline.db import (
    digest_already_sent,
    get_digest_subscribers,
    get_run_date,
    mark_articles_digest_date,
    record_digest_sent,
    record_pipeline_complete,
    record_pipeline_start,
)
from pipeline.degradation import select_digest_articles
from pipeline.email_sender import send_email
from pipeline.embed import embed_all_articles
from pipeline.ingest import ingest_all_sources

logger = logging.getLogger(__name__)


def run_pipeline(personal_mode: bool = False, personal_email: str | None = None) -> None:
    start = time.time()
    run_date = get_run_date()
    run_id: int | None = None

    if not personal_mode and digest_already_sent(run_date):
        logger.info("Digest already sent for %s. Exiting.", run_date)
        return

    if not personal_mode:
        run_id = record_pipeline_start(run_date)
        
    articles_ingested = 0
    articles_embedded = 0
    digest_sent = False
    degraded = False

    logger.info("Starting Skim pipeline for %s%s", run_date, " (PERSONAL MODE)" if personal_mode else "")

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
            logger.info("No stories selected  -  sending quiet-day digest")

        duration_seconds = round(time.time() - start)
        stats = {
            "articles_ingested": articles_ingested,
            "articles_embedded": articles_embedded,
            "duration_seconds": duration_seconds,
            "degraded": degraded,
        }

        date_str = datetime.now(timezone.utc).strftime("%b %d, %Y")
        subject = f"Skim  -  {date_str}"
        
        if personal_mode:
            if not personal_email:
                raise ValueError("personal_email must be provided in personal mode")
            subscribers = [{
                "email": personal_email,
                "theme": "cyan",
                "format": "full",
                "max_stories": 8,
                "topic_filters": None
            }]
        else:
            subscribers = get_digest_subscribers()
            
        if not subscribers:
            raise ValueError("No digest subscribers configured")

        sent_count = 0
        for subscriber in subscribers:
            html = compose_digest(
                digest_articles,
                stats=stats,
                rationale=rationale,
                digest_date=datetime.now(timezone.utc),
                theme=subscriber.get("theme"),
                format_name=subscriber.get("format"),
                topic_filters=subscriber.get("topic_filters"),
                max_stories=subscriber.get("max_stories"),
            )
            if send_email(
                subject=subject,
                html=html,
                to=subscriber["email"],
            ):
                sent_count += 1
            else:
                logger.error("Failed to send digest to %s", subscriber["email"])

        if sent_count > 0:
            article_ids = [article["id"] for article in digest_articles]
            if not personal_mode:
                record_digest_sent(run_date, article_ids, subject)
                mark_articles_digest_date(article_ids, run_date)
            digest_sent = True
            logger.info(
                "Digest sent to %d/%d subscribers with %d stories for %s%s",
                sent_count,
                len(subscribers),
                len(digest_articles),
                run_date,
                " (degraded)" if degraded else "",
            )
        else:
            logger.error("Digest email was not sent  -  not recording digest row")

        if not personal_mode:
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
        if not personal_mode and run_id is not None:
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
    parser = argparse.ArgumentParser(description="Run the Skim pipeline.")
    parser.add_argument("--personal", action="store_true", help="Run in personal mode without touching global digest state.")
    parser.add_argument("--email", type=str, help="Recipient email for personal mode.")
    args = parser.parse_args()

    configure_logging()
    run_pipeline(personal_mode=args.personal, personal_email=args.email)
