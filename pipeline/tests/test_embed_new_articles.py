import uuid
from datetime import datetime, timezone

import pytest

from pipeline.db import get_connection, insert_articles
from pipeline.embed import embed_new_articles
from pipeline.models import Article

TEST_URL_PREFIX = "https://skim-embed-test.example.com/"


def _make_article(path: str, title: str | None = None) -> Article:
    return Article(
        title=title or f"Test article {path}",
        url=f"{TEST_URL_PREFIX}{path}",
        source="test",
        published_at=datetime.now(timezone.utc),
        summary=f"Summary for {path}",
    )


def _delete_test_articles() -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM articles WHERE url LIKE %s", (f"{TEST_URL_PREFIX}%",)
            )
        conn.commit()
    finally:
        conn.close()


def _count_missing_embeddings(urls: list[str]) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM articles
                WHERE url = ANY(%s) AND embedding IS NULL
                """,
                (urls,),
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


def _get_embedding_for_url(url: str) -> list[float] | None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT embedding::text FROM articles WHERE url = %s",
                (url,),
            )
            row = cur.fetchone()
            if not row or row[0] is None:
                return None
            return [float(value) for value in row[0].strip("[]").split(",")]
    finally:
        conn.close()


@pytest.fixture
def test_run_id():
    run_id = uuid.uuid4().hex
    yield run_id
    _delete_test_articles()


@pytest.mark.integration
def test_embed_new_articles_embeds_inserted_rows(test_run_id):
    articles = [_make_article(f"{test_run_id}-{i}") for i in range(5)]
    urls = [article.url for article in articles]

    insert_articles(articles)
    assert _count_missing_embeddings(urls) == 5

    embedded = embed_new_articles()

    assert embedded >= 5
    assert _count_missing_embeddings(urls) == 0


@pytest.mark.integration
def test_embed_new_articles_is_idempotent(test_run_id):
    article = _make_article(f"{test_run_id}-idempotent")
    insert_articles([article])

    assert embed_new_articles() == 1
    first_embedding = _get_embedding_for_url(article.url)

    assert embed_new_articles() == 0
    assert _get_embedding_for_url(article.url) == first_embedding


@pytest.mark.integration
def test_embed_new_articles_only_embeds_new_rows(test_run_id):
    initial = [_make_article(f"{test_run_id}-initial-{i}") for i in range(3)]
    insert_articles(initial)
    assert embed_new_articles() == 3

    new_articles = [_make_article(f"{test_run_id}-new-{i}") for i in range(2)]
    new_urls = [article.url for article in new_articles]
    insert_articles(new_articles)

    assert _count_missing_embeddings(new_urls) == 2
    assert embed_new_articles() == 2
    assert _count_missing_embeddings(new_urls) == 0
