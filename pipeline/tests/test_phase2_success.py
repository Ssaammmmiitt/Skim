"""Phase 2 success criteria, checked against the live corpus."""

import pytest

from pipeline.embed import (
    count_missing_embeddings,
    embed_all_articles,
    embed_new_articles,
    search_similar,
)

AI_KEYWORDS = (
    "ai",
    "gpt",
    "openai",
    "llm",
    "model",
    "machine learning",
    "neural",
    "anthropic",
    "gemini",
    "transformer",
    "hugging face",
)

# Matches the search_similar default.
THRESHOLD = 0.3


def _top_similarity(query: str) -> float:
    results = search_similar(query, k=5, min_similarity=0.0)
    return float(results[0]["similarity"]) if results else 0.0


@pytest.fixture(scope="module", autouse=True)
def corpus_embedded():
    embed_all_articles()


@pytest.mark.integration
def test_all_articles_have_embeddings():
    assert count_missing_embeddings() == 0


@pytest.mark.integration
def test_openai_gpt_query_ranks_ai_articles_at_top():
    results = search_similar("OpenAI GPT", k=5, min_similarity=THRESHOLD)
    assert results, "Expected AI-related matches above the similarity threshold"

    top = results[0]
    top_text = f"{top['title']} {top.get('summary') or ''}".lower()
    assert any(keyword in top_text for keyword in AI_KEYWORDS)


@pytest.mark.integration
def test_cooking_recipes_query_returns_low_similarity_results():
    assert search_similar("cooking recipes", k=5, min_similarity=THRESHOLD) == []
    assert _top_similarity("cooking recipes") < THRESHOLD


@pytest.mark.integration
def test_offtopic_query_scores_below_ontopic_query():
    assert _top_similarity("cooking recipes") < _top_similarity("OpenAI GPT")


@pytest.mark.integration
def test_embed_step_is_idempotent():
    assert embed_new_articles() == 0
    assert embed_all_articles() == 0
    assert count_missing_embeddings() == 0
