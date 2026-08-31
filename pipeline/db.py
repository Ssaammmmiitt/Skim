import json
import logging
import os
import time
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import quote

import psycopg2
from dotenv import load_dotenv
from psycopg2.extensions import connection as PgConnection

from pipeline.models import Article
from pipeline.sources.base import normalize_url

load_dotenv(Path(__file__).resolve().parent / ".env")


def _encode_db_password(db_url: str) -> str:
    if not db_url.startswith("postgresql://"):
        return db_url

    rest = db_url[len("postgresql://") :]
    if "@" not in rest:
        return db_url

    userinfo, hostpart = rest.rsplit("@", 1)
    if ":" not in userinfo:
        return db_url

    user, password = userinfo.split(":", 1)
    if "@" not in password:
        return db_url

    return f"postgresql://{user}:{quote(password, safe='')}@{hostpart}"


DB_CONNECT_MAX_RETRIES = 3
DB_CONNECT_BACKOFF_SECONDS = 2

logger = logging.getLogger(__name__)


def get_connection() -> PgConnection:
    db_url = os.environ.get("SUPABASE_DB_URL", "")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is not set")

    db_url = _encode_db_password(db_url)

    for attempt in range(DB_CONNECT_MAX_RETRIES):
        try:
            conn = psycopg2.connect(db_url, connect_timeout=10)
            if attempt > 0:
                logger.info("DB connection succeeded on retry %d", attempt + 1)
            return conn
        except psycopg2.OperationalError as exc:
            if (
                "Network is unreachable" in str(exc)
                and "db." in db_url
                and ".supabase.co" in db_url
            ):
                raise psycopg2.OperationalError(
                    f"{exc}\n\n"
                    "Supabase direct connections (db.*.supabase.co) use IPv6, which GitHub "
                    "Actions cannot reach. Set SUPABASE_DB_URL to the Supavisor pooler string "
                    "from Dashboard → Connect → Transaction pooler (port 6543)."
                ) from exc
            if attempt < DB_CONNECT_MAX_RETRIES - 1:
                delay = DB_CONNECT_BACKOFF_SECONDS * (2**attempt)
                logger.warning(
                    "DB connection failed (attempt %d/%d): %s  -  retrying in %ds",
                    attempt + 1,
                    DB_CONNECT_MAX_RETRIES,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                raise


def insert_articles(articles: list[Article]) -> int:
    if not articles:
        return 0

    conn = get_connection()
    inserted = 0
    try:
        with conn.cursor() as cur:
            for article in articles:
                cur.execute(
                    """
                    INSERT INTO articles (title, url, source, published_at, summary, raw_text)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url) DO NOTHING
                    RETURNING id
                    """,
                    (
                        article.title,
                        normalize_url(str(article.url)),
                        article.source,
                        article.published_at,
                        article.summary,
                        article.raw_text,
                    ),
                )
                if cur.fetchone():
                    inserted += 1
        conn.commit()
    finally:
        conn.close()

    return inserted


def get_todays_new_articles() -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary, raw_text
                FROM articles
                WHERE created_at::date = CURRENT_DATE
                ORDER BY created_at DESC
                """
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def get_unclassified_articles(limit: int = 100) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary
                FROM articles
                WHERE topic IS NULL OR importance_score IS NULL
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def update_article_classification(
    article_id: int, topic: str, importance_score: float
) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE articles
                SET topic = %s, importance_score = %s
                WHERE id = %s
                """,
                (topic, importance_score, article_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_articles_needing_insights(
    min_score: float = 5, limit: int = 100
) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary, topic, importance_score,
                       insight, key_takeaway
                FROM articles
                WHERE importance_score >= %s
                  AND (insight IS NULL OR key_takeaway IS NULL)
                ORDER BY importance_score DESC, created_at DESC
                LIMIT %s
                """,
                (min_score, limit),
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def update_article_insight(article_id: int, insight: str, key_takeaway: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE articles
                SET insight = %s, key_takeaway = %s
                WHERE id = %s
                """,
                (insight, key_takeaway, article_id),
            )
        conn.commit()
    finally:
        conn.close()


def get_todays_classified_articles() -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary, topic, importance_score,
                       insight, key_takeaway
                FROM articles
                WHERE created_at::date = CURRENT_DATE
                  AND topic IS NOT NULL
                  AND importance_score IS NOT NULL
                ORDER BY importance_score DESC, created_at DESC
                """
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def digest_already_sent(digest_date: date) -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM digests WHERE digest_date = %s",
                (digest_date,),
            )
            return cur.fetchone() is not None
    finally:
        conn.close()


def record_digest_sent(digest_date: date, article_ids: list[int], subject: str) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO digests (digest_date, article_ids, story_count, subject)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (digest_date) DO NOTHING
                """,
                (digest_date, article_ids, len(article_ids), subject),
            )
        conn.commit()
    finally:
        conn.close()


def mark_articles_digest_date(article_ids: list[int], digest_date: date) -> None:
    if not article_ids:
        return

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE articles
                SET digest_date = %s
                WHERE id = ANY(%s)
                """,
                (digest_date, article_ids),
            )
        conn.commit()
    finally:
        conn.close()


def record_pipeline_start(run_date: date) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pipeline_runs (run_date, status)
                VALUES (%s, 'running')
                RETURNING id
                """,
                (run_date,),
            )
            run_id = cur.fetchone()[0]
        conn.commit()
        return run_id
    finally:
        conn.close()


def record_pipeline_complete(
    run_id: int,
    *,
    status: str,
    articles_ingested: int = 0,
    articles_embedded: int = 0,
    digest_sent: bool = False,
    duration_seconds: float = 0,
    error: str | None = None,
) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            errors_json = json.dumps([{"message": error}]) if error else "[]"
            cur.execute(
                """
                UPDATE pipeline_runs
                SET completed_at = NOW(),
                    status = %s,
                    articles_ingested = %s,
                    articles_embedded = %s,
                    digest_sent = %s,
                    duration_seconds = %s,
                    errors = %s::jsonb
                WHERE id = %s
                """,
                (
                    status,
                    articles_ingested,
                    articles_embedded,
                    digest_sent,
                    duration_seconds,
                    errors_json,
                    run_id,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def get_articles_by_ids(article_ids: list[int]) -> list[dict[str, Any]]:
    if not article_ids:
        return []

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary, topic, importance_score,
                       insight, key_takeaway
                FROM articles
                WHERE id = ANY(%s)
                ORDER BY importance_score DESC NULLS LAST, id
                """,
                (article_ids,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()

    by_id = {row["id"]: row for row in rows}
    return [by_id[article_id] for article_id in article_ids if article_id in by_id]


def get_articles_by_urls(urls: list[str]) -> list[dict[str, Any]]:
    if not urls:
        return []

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, published_at, summary, topic, importance_score,
                       insight, key_takeaway
                FROM articles
                WHERE url = ANY(%s)
                ORDER BY id
                """,
                (urls,),
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def get_recent_pipeline_runs(limit: int = 7) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (run_date)
                       run_date, status, articles_ingested, articles_embedded,
                       digest_sent, duration_seconds, errors
                FROM pipeline_runs
                ORDER BY run_date DESC, id DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    runs: list[dict[str, Any]] = []
    for row in rows:
        errors = row[6] or []
        error_message = errors[0].get("message") if errors else None
        runs.append(
            {
                "run_date": row[0],
                "status": row[1],
                "articles_ingested": row[2],
                "articles_embedded": row[3],
                "digest_sent": row[4],
                "duration_seconds": row[5],
                "error_message": error_message,
            }
        )
    return runs


def get_recent_digests(limit: int = 7) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT digest_date, story_count, subject, sent_at
                FROM digests
                ORDER BY digest_date DESC
                LIMIT %s
                """,
                (limit,),
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


def count_total_articles() -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM articles")
            return cur.fetchone()[0]
    finally:
        conn.close()


def count_articles_created_on(day: date) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM articles WHERE created_at::date = %s",
                (day,),
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def count_duplicate_article_urls() -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT url FROM articles GROUP BY url HAVING COUNT(*) > 1
                ) duplicates
                """
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def get_digest_subscribers() -> list[dict[str, Any]]:
    """Active subscribers with digest preferences. Falls back to DIGEST_RECIPIENT env."""
    from pipeline.digest_preferences import subscriber_defaults

    fallback = os.environ.get("DIGEST_RECIPIENT", "").strip()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ds.email,
                       COALESCE(p.theme, 'cyan') AS theme,
                       COALESCE(p.format, 'full') AS format,
                       COALESCE(p.max_stories, 8) AS max_stories,
                       p.topic_filters
                FROM digest_subscribers ds
                JOIN profiles pr ON pr.id = ds.user_id
                LEFT JOIN user_digest_preferences p ON p.user_id = ds.user_id
                WHERE ds.active = TRUE
                  AND pr.status = 'active'
                  AND COALESCE(p.email_enabled, TRUE) = TRUE
                ORDER BY ds.email
                """
            )
            rows = cur.fetchall()
    except Exception as exc:
        logger.warning(
            "Could not load digest_subscribers (%s); using env fallback", exc
        )
        if fallback:
            return [subscriber_defaults(fallback)]
        return []
    finally:
        conn.close()

    if not rows:
        if fallback:
            return [subscriber_defaults(fallback)]
        return []

    subscribers: list[dict[str, Any]] = []
    for row in rows:
        subscribers.append(
            {
                "email": row[0],
                "theme": row[1],
                "format": row[2],
                "max_stories": row[3],
                "topic_filters": list(row[4]) if row[4] else None,
            }
        )
    return subscribers
