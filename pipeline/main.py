"""Skim pipeline entry point: ingest → embed → reason → compose → send."""

from __future__ import annotations

import logging
import time
from datetime import date, datetime, timezone

from pipeline.agent.reasoning import run_agent_reasoning
from pipeline.compose import compose_digest
from pipeline.db import (
    digest_already_sent,
    mark_articles_digest_date,
    record_digest_sent,
    record_pipeline_complete,
    record_pipeline_start,
)
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

    try:
        new_articles = ingest_all_sources()
        articles_ingested = len(new_articles)

        articles_embedded = embed_all_articles(batch_size=100)

        selection = run_agent_reasoning(new_articles)
        digest_articles = selection.get("articles", [])
        rationale = selection.get("rationale", "")

        duration_seconds = round(time.time() - start)
        stats = {
            "articles_ingested": articles_ingested,
            "articles_embedded": articles_embedded,
            "duration_seconds": duration_seconds,
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
                "Digest sent with %d stories for %s",
                len(digest_articles),
                run_date,
            )
        else:
            logger.error("Digest email was not sent — not recording digest row")

        record_pipeline_complete(
            run_id,
            status="success" if digest_sent else "partial",
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
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    run_pipeline()
