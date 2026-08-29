import uuid
from datetime import datetime, timezone

import pytest

from pipeline.db import _encode_db_password, get_connection, insert_articles
from pipeline.models import Article

TEST_URL_PREFIX = "https://skim-test.example.com/"


def test_encode_db_password_encodes_at_sign_in_password():
    url = "postgresql://postgres:pa@ss@db.example.supabase.co:5432/postgres"
    assert (
        _encode_db_password(url)
        == "postgresql://postgres:pa%40ss@db.example.supabase.co:5432/postgres"
    )


def test_encode_db_password_leaves_simple_password_unchanged():
    url = "postgresql://postgres:secret@db.example.supabase.co:5432/postgres"
    assert _encode_db_password(url) == url


def _make_article(path: str) -> Article:
    return Article(
        title=f"Test article {path}",
        url=f"{TEST_URL_PREFIX}{path}",
        source="test",
        published_at=datetime.now(timezone.utc),
        summary="Test summary",
    )


def _count_articles(urls: list[str]) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM articles WHERE url = ANY(%s)",
                (urls,),
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def _delete_test_articles() -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM articles WHERE url LIKE %s", (f"{TEST_URL_PREFIX}%",))
        conn.commit()
    finally:
        conn.close()


@pytest.fixture
def test_run_id():
    run_id = uuid.uuid4().hex
    yield run_id
    _delete_test_articles()


@pytest.mark.integration
def test_insert_articles_inserts_new_rows(test_run_id):
    articles = [_make_article(f"{test_run_id}-{i}") for i in range(5)]
    urls = [article.url for article in articles]

    inserted = insert_articles(articles)

    assert inserted == 5
    assert _count_articles(urls) == 5


@pytest.mark.integration
def test_insert_articles_skips_duplicates(test_run_id):
    articles = [_make_article(f"{test_run_id}-dup-{i}") for i in range(5)]
    urls = [article.url for article in articles]

    assert insert_articles(articles) == 5
    assert insert_articles(articles) == 0
    assert _count_articles(urls) == 5


@pytest.mark.integration
def test_insert_articles_inserts_only_new_rows(test_run_id):
    existing = [_make_article(f"{test_run_id}-mixed-{i}") for i in range(2)]
    new_articles = [_make_article(f"{test_run_id}-mixed-new-{i}") for i in range(3)]
    all_articles = existing + new_articles + existing

    assert insert_articles(existing) == 2
    inserted = insert_articles(all_articles)

    assert inserted == 3
    assert _count_articles([article.url for article in existing + new_articles]) == 5
