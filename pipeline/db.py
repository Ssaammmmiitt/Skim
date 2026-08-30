import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2.extensions import connection as PgConnection
from urllib.parse import quote

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


def get_connection() -> PgConnection:
    db_url = os.environ.get("SUPABASE_DB_URL", "")
    if not db_url:
        raise ValueError("SUPABASE_DB_URL is not set")

    db_url = _encode_db_password(db_url)
    try:
        return psycopg2.connect(db_url)
    except psycopg2.OperationalError as exc:
        if "Network is unreachable" in str(exc) and "db." in db_url and ".supabase.co" in db_url:
            raise psycopg2.OperationalError(
                f"{exc}\n\n"
                "Supabase direct connections (db.*.supabase.co) use IPv6, which GitHub "
                "Actions cannot reach. Set SUPABASE_DB_URL to the Supavisor pooler string "
                "from Dashboard → Connect → Transaction pooler (port 6543)."
            ) from exc
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


def get_todays_new_articles() -> list[dict]:
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


def get_unclassified_articles(limit: int = 100) -> list[dict]:
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
) -> list[dict]:
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


def update_article_insight(
    article_id: int, insight: str, key_takeaway: str
) -> None:
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


def get_todays_classified_articles() -> list[dict]:
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


def get_articles_by_urls(urls: list[str]) -> list[dict]:
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
