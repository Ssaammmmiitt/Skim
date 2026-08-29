import os

import pytest
import requests

from pipeline.embed import embed_texts, search_similar, search_similar_articles_rpc


def _deploy_search_rpc() -> None:
    from pathlib import Path

    from pipeline.db import get_connection

    sql = (Path(__file__).resolve().parents[2] / "sql" / "schema.sql").read_text()
    rpc_sql = sql.split("CREATE OR REPLACE FUNCTION search_similar_articles", 1)[1]
    rpc_sql = "CREATE OR REPLACE FUNCTION search_similar_articles" + rpc_sql

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(rpc_sql)
        conn.commit()
    finally:
        conn.close()


@pytest.fixture(scope="module", autouse=True)
def ensure_search_rpc():
    _deploy_search_rpc()


@pytest.mark.integration
def test_search_similar_articles_rpc_returns_ordered_results():
    results = search_similar_articles_rpc(
        "artificial intelligence", match_count=5, match_threshold=0.0
    )

    assert results
    similarities = [float(result["similarity"]) for result in results]
    assert similarities == sorted(similarities, reverse=True)
    assert all(result["title"] for result in results)


@pytest.mark.integration
def test_search_similar_articles_rpc_matches_python_search():
    query = "machine learning"

    rpc_results = search_similar_articles_rpc(query, match_count=5, match_threshold=0.0)
    python_results = search_similar(query, k=5, min_similarity=0.0)

    assert [row["id"] for row in rpc_results] == [row["id"] for row in python_results]


@pytest.mark.integration
def test_search_similar_articles_via_supabase_rest_api():
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_PUBLISHABLE_KEY"]
    embedding = embed_texts(["OpenAI and large language models"])[0]

    response = requests.post(
        f"{supabase_url}/rest/v1/rpc/search_similar_articles",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        },
        json={
            "query_embedding": embedding,
            "match_count": 5,
            "match_threshold": 0.0,
        },
        timeout=30,
    )

    assert response.status_code == 200, response.text
    results = response.json()
    assert results
    assert all("similarity" in row and "title" in row for row in results)
