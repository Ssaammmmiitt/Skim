import uuid
from datetime import datetime, timezone

import pytest

from pipeline.db import insert_articles
from pipeline.embed import embed_new_articles, search_similar
from pipeline.models import Article

TEST_URL_PREFIX = "https://skim-search-test.example.com/"


def _make_article(path: str, title: str, summary: str, source: str) -> Article:
    return Article(
        title=title,
        url=f"{TEST_URL_PREFIX}{path}",
        source=source,
        published_at=datetime.now(timezone.utc),
        summary=summary,
    )


def _delete_test_articles() -> None:
    from pipeline.db import get_connection

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM articles WHERE url LIKE %s", (f"{TEST_URL_PREFIX}%",))
        conn.commit()
    finally:
        conn.close()


def _seed_search_corpus() -> list[Article]:
    articles = [
        _make_article(
            "ai-1",
            "Large language model breakthrough in AI research",
            "OpenAI and Google advance transformer neural networks for machine learning.",
            "search-test-ai",
        ),
        _make_article(
            "ai-2",
            "New GPT model improves reasoning benchmarks",
            "Researchers report better performance on coding and math with LLMs.",
            "search-test-ai",
        ),
        _make_article(
            "ai-3",
            "AI chip demand surges for data centers",
            "Nvidia and AMD compete to power large-scale model training clusters.",
            "search-test-ai",
        ),
        _make_article(
            "cook-1",
            "Classic pasta recipe with garlic and olive oil",
            "A simple Italian weeknight dinner with spaghetti and fresh herbs.",
            "search-test-cooking",
        ),
        _make_article(
            "cook-2",
            "How to bake sourdough bread at home",
            "Starter tips for crusty artisan loaves in your kitchen oven.",
            "search-test-cooking",
        ),
        _make_article(
            "cook-3",
            "Best chocolate cake recipe for birthdays",
            "Moist layers with buttercream frosting for celebrations.",
            "search-test-cooking",
        ),
    ]
    insert_articles(articles)
    embed_new_articles()
    return articles


@pytest.fixture
def search_corpus():
    run_id = uuid.uuid4().hex
    _delete_test_articles()
    articles = _seed_search_corpus()
    yield run_id, articles
    _delete_test_articles()


def _test_results(results: list[dict]) -> list[dict]:
    return [result for result in results if result["url"].startswith(TEST_URL_PREFIX)]


@pytest.mark.integration
def test_search_similar_returns_ai_articles_for_llm_query(search_corpus):
    results = search_similar("large language model", k=100, min_similarity=0.1)
    test_results = sorted(
        _test_results(results),
        key=lambda result: float(result["similarity"]),
        reverse=True,
    )

    assert len(test_results) >= 3
    assert test_results[0]["source"] == "search-test-ai"


@pytest.mark.integration
def test_search_similar_returns_cooking_articles_for_pasta_query(search_corpus):
    results = search_similar("pasta recipe", k=100, min_similarity=0.1)
    test_results = sorted(
        _test_results(results),
        key=lambda result: float(result["similarity"]),
        reverse=True,
    )

    assert test_results
    assert test_results[0]["source"] == "search-test-cooking"
    assert "pasta" in test_results[0]["title"].lower()


@pytest.mark.integration
def test_search_similar_respects_k_limit(search_corpus):
    results = search_similar("machine learning", k=1, min_similarity=0.0)

    assert len(results) == 1
