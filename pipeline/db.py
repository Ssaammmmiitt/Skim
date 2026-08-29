import os

import psycopg2
from dotenv import load_dotenv
from psycopg2.extensions import connection as PgConnection
from urllib.parse import quote

from pipeline.models import Article
from pipeline.sources.base import normalize_url

load_dotenv()


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
