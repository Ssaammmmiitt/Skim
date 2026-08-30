import re
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from pipeline.agent.llm_client import LLMProviderError
from pipeline.agent.reasoning import ArticleAgent, chunked, run_agent_reasoning
from pipeline.db import (
    get_articles_by_urls,
    get_connection,
    insert_articles,
    update_article_classification,
)
from pipeline.models import Article

TEST_URL_PREFIX = "https://skim-agent-test.example.com/"


def _make_article(path: str, title: str, summary: str, source: str = "test") -> Article:
    return Article(
        title=title,
        url=f"{TEST_URL_PREFIX}{path}",
        source=source,
        published_at=datetime.now(timezone.utc),
        summary=summary,
    )


def _delete_test_articles() -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM articles WHERE url LIKE %s", (f"{TEST_URL_PREFIX}%",))
        conn.commit()
    finally:
        conn.close()


def _insert_and_fetch(articles: list[Article]) -> list[dict]:
    insert_articles(articles)
    urls = [article.url for article in articles]
    return get_articles_by_urls(urls)


def _classify_article(article: dict, topic: str, importance_score: float) -> dict:
    update_article_classification(article["id"], topic, importance_score)
    return get_articles_by_urls([article["url"]])[0]


def _tokenize(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2}


def _insight_adds_analytical_value(insight: str, title: str, summary: str) -> bool:
    insight_lower = insight.lower()
    generic_phrases = [
        "this is interesting",
        "time will tell",
        "remains to be seen",
        "worth watching",
        "only time will tell",
    ]
    if any(phrase in insight_lower for phrase in generic_phrases):
        return False
    if len(insight) < 80:
        return False

    title_tokens = _tokenize(title)
    summary_tokens = _tokenize(summary)
    insight_tokens = _tokenize(insight)
    if not insight_tokens:
        return False

    title_overlap = len(title_tokens & insight_tokens) / len(title_tokens)
    summary_overlap = len(summary_tokens & insight_tokens) / max(len(summary_tokens), 1)
    new_tokens = insight_tokens - title_tokens - summary_tokens
    return title_overlap < 0.85 or summary_overlap < 0.75 or len(new_tokens) >= 8


def _insight_mentions_implications(insight: str) -> bool:
    implication_signals = [
        "means",
        "implication",
        "impact",
        "will",
        "should",
        "teams",
        "developers",
        "engineers",
        "because",
        "shift",
        "change",
        "revisit",
        "unlock",
        "enable",
        "force",
        "push",
        "affect",
        "reshape",
        "cost",
        "risk",
        "opportunity",
    ]
    insight_lower = insight.lower()
    return any(signal in insight_lower for signal in implication_signals)


@pytest.fixture
def test_run_id():
    run_id = uuid.uuid4().hex
    yield run_id
    _delete_test_articles()


def test_chunked_splits_items():
    assert list(chunked([1, 2, 3, 4, 5], 2)) == [[1, 2], [3, 4], [5]]


def test_classify_batch_returns_empty_for_no_articles():
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)
    assert agent.classify_batch([]) == []
    agent.llm.chat_with_tools.assert_not_called()


def test_classify_batch_updates_db_with_mock_llm(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-mock-1",
                "OpenAI ships GPT-5",
                "Major model release for developers.",
            )
        ]
    )
    article = articles[0]

    mock_llm = MagicMock()
    mock_llm.chat_with_tools.return_value = {
        "provider": "gemini",
        "content": None,
        "tool_calls": [
            {
                "name": "classify_article",
                "arguments": {
                    "article_id": article["id"],
                    "topic": "ai_ml",
                    "importance_score": 9,
                    "reasoning": "Major AI release",
                },
            }
        ],
    }

    agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
    result = agent.classify_batch(articles)

    assert len(result) == 1
    assert result[0]["topic"] == "ai_ml"
    updated = get_articles_by_urls([article["url"]])[0]
    assert updated["topic"] == "ai_ml"
    assert float(updated["importance_score"]) == 9


def test_classify_batch_keeps_progress_when_providers_fail(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(f"{test_run_id}-quota-1", "First article", "Summary one."),
            _make_article(f"{test_run_id}-quota-2", "Second article", "Summary two."),
        ]
    )

    mock_llm = MagicMock()
    mock_llm.chat_with_tools.side_effect = [
        {
            "provider": "gemini",
            "content": None,
            "tool_calls": [
                {
                    "name": "classify_article",
                    "arguments": {
                        "article_id": articles[0]["id"],
                        "topic": "ai_ml",
                        "importance_score": 7,
                        "reasoning": "Classified before quota ran out",
                    },
                }
            ],
        },
        LLMProviderError("Both Gemini and Groq failed"),
    ]

    agent = ArticleAgent(llm=mock_llm, batch_size=1, batch_delay_seconds=0)
    result = agent.classify_batch(articles)

    assert len(result) == 1
    assert result[0]["article_id"] == articles[0]["id"]
    stored = get_articles_by_urls([articles[0]["url"]])[0]
    assert stored["topic"] == "ai_ml"


def test_generate_insights_keeps_progress_when_providers_fail(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(f"{test_run_id}-ins-quota-1", "First big story", "Summary one."),
            _make_article(f"{test_run_id}-ins-quota-2", "Second big story", "Summary two."),
        ]
    )
    classified = [_classify_article(article, "ai_ml", 8) for article in articles]

    mock_llm = MagicMock()
    mock_llm.chat_with_tools.side_effect = [
        {
            "provider": "gemini",
            "content": None,
            "tool_calls": [
                {
                    "name": "generate_insight",
                    "arguments": {
                        "article_id": classified[0]["id"],
                        "insight": "This shifts how teams budget inference costs.",
                        "key_takeaway": "Revisit inference cost assumptions.",
                    },
                }
            ],
        },
        LLMProviderError("Both Gemini and Groq failed"),
    ]

    agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
    result = agent.generate_insights(classified)

    assert len(result) == 1
    stored = get_articles_by_urls([classified[0]["url"]])[0]
    assert stored["insight"] is not None


def test_validate_classification_rejects_unknown_article_id(test_run_id):
    articles = _insert_and_fetch(
        [_make_article(f"{test_run_id}-validate", "Test", "Summary")]
    )
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)

    with pytest.raises(ValueError, match="Unexpected article_id"):
        agent._validate_classification(
            {
                "article_id": articles[0]["id"] + 999,
                "topic": "ai_ml",
                "importance_score": 5,
            },
            {articles[0]["id"]},
        )


@pytest.mark.integration
def test_classify_batch_scores_gpt_release_high(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-gpt5",
                "GPT-5 released with major reasoning improvements",
                "OpenAI launches GPT-5 with better coding and agent capabilities.",
                source="techcrunch",
            )
        ]
    )

    agent = ArticleAgent(batch_delay_seconds=0)
    result = agent.classify_batch(articles)

    assert result
    assert result[0]["topic"] == "ai_ml"
    assert result[0]["importance_score"] >= 8

    stored = get_articles_by_urls([articles[0]["url"]])[0]
    assert stored["topic"] == "ai_ml"
    assert float(stored["importance_score"]) >= 8


@pytest.mark.integration
def test_classify_batch_scores_minor_css_update_low(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-css",
                "Minor CSS library update fixes padding bug",
                "A small utility library shipped a patch for margin and padding classes.",
                source="hackernews",
            )
        ]
    )

    agent = ArticleAgent(batch_delay_seconds=0)
    result = agent.classify_batch(articles)

    assert result
    assert result[0]["importance_score"] <= 4

    stored = get_articles_by_urls([articles[0]["url"]])[0]
    assert stored["topic"] is not None
    assert stored["importance_score"] is not None
    assert float(stored["importance_score"]) <= 4


@pytest.mark.integration
def test_classify_batch_assigns_topics_for_mixed_batch(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-ai-1",
                "New transformer architecture improves LLM efficiency",
                "Researchers cut inference cost for large language models.",
            ),
            _make_article(
                f"{test_run_id}-ai-2",
                "OpenAI expands API access for GPT models",
                "Developers get broader access to frontier models.",
            ),
            _make_article(
                f"{test_run_id}-ai-3",
                "Google DeepMind publishes new AI safety benchmark",
                "A benchmark evaluates alignment risks in agent systems.",
            ),
            _make_article(
                f"{test_run_id}-cook-1",
                "Best sourdough bread recipe for beginners",
                "A step-by-step guide to baking crusty bread at home.",
            ),
            _make_article(
                f"{test_run_id}-cook-2",
                "Classic pasta recipe with garlic and olive oil",
                "Simple weeknight Italian dinner instructions.",
            ),
        ]
    )

    agent = ArticleAgent(batch_size=5, batch_delay_seconds=0)
    results = agent.classify_batch(articles)

    assert len(results) >= 3
    topics = {item["topic"] for item in results}
    assert "ai_ml" in topics

    stored = get_articles_by_urls([article["url"] for article in articles])
    assert all(row["topic"] is not None for row in stored)
    assert all(row["importance_score"] is not None for row in stored)


@pytest.mark.integration
@patch("pipeline.agent.reasoning.get_unclassified_articles")
def test_classify_unclassified_articles_processes_db_rows(
    mock_get_unclassified, test_run_id
):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-unclassified",
                "Kubernetes 1.33 ships with storage improvements",
                "The release improves volume snapshot workflows for operators.",
                source="arstechnica",
            )
        ]
    )
    mock_get_unclassified.return_value = articles

    agent = ArticleAgent(batch_delay_seconds=0)
    results = agent.classify_unclassified_articles(limit=10)

    mock_get_unclassified.assert_called_once_with(limit=10)
    classified_ids = {item["article_id"] for item in results}
    assert articles[0]["id"] in classified_ids

    stored = get_articles_by_urls([articles[0]["url"]])[0]
    assert stored["topic"] is not None
    assert stored["importance_score"] is not None


def test_generate_insights_returns_empty_for_no_articles():
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)
    assert agent.generate_insights([]) == []
    agent.llm.chat_with_tools.assert_not_called()


def test_generate_insights_updates_db_with_mock_llm(test_run_id):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-insight",
                "AWS cuts S3 egress fees by 80%",
                "Major hyperscaler reduces data transfer pricing after regulatory pressure.",
            )
        ]
    )
    article = _classify_article(articles[0], "cloud_infra", 8)

    mock_llm = MagicMock()
    mock_llm.chat_with_tools.return_value = {
        "provider": "gemini",
        "content": None,
        "tool_calls": [
            {
                "name": "generate_insight",
                "arguments": {
                    "article_id": article["id"],
                    "insight": (
                        "Egress fees have quietly inflated multi-cloud architectures. "
                        "Teams should revisit single-region cost assumptions."
                    ),
                    "key_takeaway": "Lower egress may unlock cheaper multi-region pipelines.",
                },
            }
        ],
    }

    agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
    result = agent.generate_insights([article])

    assert len(result) == 1
    assert "egress" in result[0]["insight"].lower()
    updated = get_articles_by_urls([article["url"]])[0]
    assert updated["insight"] is not None
    assert updated["key_takeaway"] is not None


def test_validate_insight_rejects_wrong_article_id(test_run_id):
    articles = _insert_and_fetch(
        [_make_article(f"{test_run_id}-insight-validate", "Test", "Summary")]
    )
    article = _classify_article(articles[0], "ai_ml", 7)
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)

    with pytest.raises(ValueError, match="Unexpected article_id"):
        agent._validate_insight(
            {
                "article_id": article["id"] + 999,
                "insight": "Some insight text.",
                "key_takeaway": "Takeaway.",
            },
            article,
        )


def test_validate_insight_rejects_empty_fields(test_run_id):
    articles = _insert_and_fetch(
        [_make_article(f"{test_run_id}-insight-empty", "Test", "Summary")]
    )
    article = _classify_article(articles[0], "ai_ml", 7)
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)

    with pytest.raises(ValueError, match="must be non-empty"):
        agent._validate_insight(
            {"article_id": article["id"], "insight": "  ", "key_takeaway": "ok"},
            article,
        )


@pytest.mark.integration
def test_generate_insights_produces_analytical_ai_insight(test_run_id):
    title = "Anthropic releases Claude 4 with 1M token context and native computer use"
    summary = (
        "Anthropic's new flagship model supports million-token windows and can control "
        "desktop applications through a computer-use API for developers."
    )
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-ai-insight",
                title,
                summary,
                source="techcrunch",
            )
        ]
    )
    article = _classify_article(articles[0], "ai_ml", 9)

    agent = ArticleAgent(batch_delay_seconds=0)
    results = agent.generate_insights([article])

    assert results
    insight = results[0]["insight"]
    key_takeaway = results[0]["key_takeaway"]

    assert _insight_adds_analytical_value(insight, title, summary)
    assert _insight_mentions_implications(insight)
    assert len(key_takeaway) > 10
    assert key_takeaway.lower() != title.lower()

    stored = get_articles_by_urls([article["url"]])[0]
    assert stored["insight"] == insight
    assert stored["key_takeaway"] == key_takeaway


@pytest.mark.integration
@patch("pipeline.agent.reasoning.get_articles_needing_insights")
def test_generate_insights_for_top_articles_processes_db_rows(
    mock_get_needing, test_run_id
):
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-top-insight",
                "OpenAI releases GPT-5 with agent tooling",
                "New model supports multi-step tool use for developers.",
                source="techcrunch",
            )
        ]
    )
    article = _classify_article(articles[0], "ai_ml", 9)
    mock_get_needing.return_value = [article]

    agent = ArticleAgent(batch_delay_seconds=0)
    results = agent.generate_insights_for_top_articles(min_score=5, limit=10)

    mock_get_needing.assert_called_once_with(min_score=5, limit=10)
    assert results
    assert results[0]["article_id"] == article["id"]

    stored = get_articles_by_urls([article["url"]])[0]
    assert stored["insight"] is not None
    assert stored["key_takeaway"] is not None
    assert len(stored["insight"]) > 20
    assert len(stored["key_takeaway"]) > 5


def _build_scored_article_batch(test_run_id: str) -> list[dict]:
    high_specs = [
        ("gpt5", "GPT-5 ships with native agent tooling", "ai_ml", 9),
        ("aws", "AWS cuts S3 egress fees by 80%", "cloud_infra", 8),
        ("claude", "Anthropic expands Claude context window", "ai_ml", 8),
    ]
    mid_scores = [4, 5, 6, 4, 5, 6, 4, 5, 6, 4]
    mid_specs = [
        (f"mid-{index}", f"Notable industry update {index}", "programming", score)
        for index, score in enumerate(mid_scores, start=1)
    ]
    low_scores = [1, 2, 3, 1, 2, 3, 1]
    low_specs = [
        (f"low-{index}", f"Minor patch release {index}", "other", score)
        for index, score in enumerate(low_scores, start=1)
    ]
    specs = high_specs + mid_specs + low_specs
    articles = _insert_and_fetch(
        [
            _make_article(
                f"{test_run_id}-{slug}",
                title,
                f"Summary for {title}.",
                source="test",
            )
            for slug, title, _topic, _score in specs
        ]
    )
    classified = []
    for article, (_slug, _title, topic, score) in zip(articles, specs):
        classified.append(_classify_article(article, topic, score))
    return classified


def _assert_score_distribution(classified: list[dict]) -> None:
    high = [article for article in classified if article["importance_score"] >= 8]
    mid = [article for article in classified if 4 <= article["importance_score"] <= 6]
    low = [article for article in classified if article["importance_score"] <= 3]
    assert len(classified) == 20
    assert len(high) == 3
    assert len(mid) == 10
    assert len(low) == 7


def _naive_score_ranked_ids(classified: list[dict], count: int) -> list[int]:
    return [
        article["id"]
        for article in sorted(
            classified, key=lambda row: (-row["importance_score"], row["id"])
        )
    ][:count]


def _order_differs_from_score_ranking(
    selected: list[dict], classified: list[dict]
) -> bool:
    selected_ids = [article["id"] for article in selected]
    naive_order = _naive_score_ranked_ids(classified, len(selected))
    if selected_ids != naive_order:
        return True
    scores = [float(article["importance_score"]) for article in selected]
    return any(left < right for left, right in zip(scores, scores[1:]))


def _rationale_explains_selection(rationale: str) -> bool:
    if len(rationale) < 30:
        return False
    rationale_lower = rationale.lower()
    explanation_signals = [
        "because",
        "lead",
        "balance",
        "diversity",
        "coverage",
        "while",
        "follow",
        "important",
        "impact",
        "topic",
        "drop",
        "include",
        "select",
        "chosen",
        "priorit",
    ]
    return any(signal in rationale_lower for signal in explanation_signals)


def test_select_digest_stories_returns_empty_for_no_articles():
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)
    result = agent.select_digest_stories([])
    assert result == {"articles": [], "selected_article_ids": [], "rationale": ""}
    agent.llm.chat_with_tools.assert_not_called()


def test_select_digest_stories_preserves_agent_order(test_run_id):
    classified = _build_scored_article_batch(test_run_id)
    high_ids = [article["id"] for article in classified if article["importance_score"] >= 8]
    ordered_ids = [high_ids[2], high_ids[0], high_ids[1]] + [
        article["id"] for article in classified if article["importance_score"] < 8
    ][:5]

    mock_llm = MagicMock()
    mock_llm.chat_with_tools.return_value = {
        "provider": "gemini",
        "content": None,
        "tool_calls": [
            {
                "name": "select_top_stories",
                "arguments": {
                    "selected_article_ids": ordered_ids,
                    "rationale": (
                        "Lead with the Claude context story for practitioner impact, then "
                        "cover GPT-5 and AWS pricing while balancing topic diversity."
                    ),
                },
            }
        ],
    }

    agent = ArticleAgent(llm=mock_llm, batch_delay_seconds=0)
    result = agent.select_digest_stories(classified, n=8)

    assert result["selected_article_ids"] == ordered_ids[:8]
    assert set(high_ids).issubset(set(result["selected_article_ids"]))
    assert result["rationale"]
    assert [article["id"] for article in result["articles"]] == ordered_ids[:8]
    score_sorted_ids = [
        article["id"]
        for article in sorted(classified, key=lambda row: -row["importance_score"])
    ][:8]
    assert result["selected_article_ids"] != score_sorted_ids


def test_validate_selection_rejects_unknown_ids(test_run_id):
    classified = _build_scored_article_batch(test_run_id)[:7]
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)
    selected_ids = [article["id"] for article in classified[:6]] + [classified[-1]["id"] + 999]

    with pytest.raises(ValueError, match="Unknown article IDs"):
        agent._validate_selection(
            {
                "selected_article_ids": selected_ids,
                "rationale": "Test rationale with enough detail.",
            },
            classified,
            target_count=7,
        )


@pytest.mark.integration
def test_select_digest_stories_meets_acceptance_criteria(test_run_id):
    classified = _build_scored_article_batch(test_run_id)
    _assert_score_distribution(classified)
    top_three_ids = {
        article["id"]
        for article in classified
        if article["importance_score"] >= 8
    }

    agent = ArticleAgent(batch_delay_seconds=0)
    result = agent.select_digest_stories(classified, n=8)

    assert 7 <= len(result["articles"]) <= 10
    assert top_three_ids.issubset(set(result["selected_article_ids"]))
    assert _order_differs_from_score_ranking(result["articles"], classified)
    assert _rationale_explains_selection(result["rationale"])
    assert [article["id"] for article in result["articles"]] == result["selected_article_ids"]


def _build_reasoning_article_batch(test_run_id: str, count: int = 15) -> list[dict]:
    specs = [
        ("gpt5", "GPT-5 released with major reasoning improvements", "Major model release.", "techcrunch"),
        ("aws", "AWS announces steep S3 egress price cuts", "Hyperscaler cuts data transfer fees.", "theverge"),
        ("react", "React 20 improves server components", "Framework update for full-stack teams.", "hackernews"),
        ("k8s", "Kubernetes 1.33 ships storage improvements", "Volume snapshot workflows get better.", "arstechnica"),
        ("yc", "YC demo day highlights AI infra startups", "Three startups focus on inference cost.", "techcrunch"),
        ("ts", "TypeScript 5.9 patch release", "Minor compiler fixes.", "hackernews"),
        ("css", "CSS utility library fixes padding bug", "Small styling patch.", "hackernews"),
        ("rust", "Rust 1.90 stabilizes async traits", "Language release for systems devs.", "lobsters"),
        ("open", "Open source license debate resurfaces", "Community discusses SSPL again.", "hackernews"),
        ("db", "Postgres 18 beta adds JSON improvements", "Database preview release.", "infoq"),
        ("sec", "Routine security patches for Linux distros", "Monthly maintenance updates.", "arstechnica"),
        ("game", "Indie game engine adds WebGPU support", "Niche graphics tooling update.", "hackernews"),
        ("ml", "New benchmark measures LLM agent reliability", "Researchers publish evaluation suite.", "arxiv"),
        ("cloud", "Google Cloud cuts GPU pricing for training", "Cloud provider adjusts TPU/GPU rates.", "theverge"),
        ("start", "Startup raises seed for devtools observability", "Small funding round in monitoring.", "techcrunch"),
    ][:count]
    return _insert_and_fetch(
        [
            _make_article(f"{test_run_id}-reasoning-{slug}", title, summary, source=source)
            for slug, title, summary, source in specs
        ]
    )


def test_run_agent_reasoning_returns_empty_for_no_articles():
    agent = ArticleAgent(llm=MagicMock(), batch_delay_seconds=0)
    with patch(
        "pipeline.agent.reasoning.get_articles_needing_insights", return_value=[]
    ), patch("pipeline.agent.reasoning.get_todays_classified_articles", return_value=[]):
        result = run_agent_reasoning([], agent=agent)
    assert result == {"articles": [], "selected_article_ids": [], "rationale": ""}
    agent.llm.chat_with_tools.assert_not_called()


@pytest.mark.integration
@patch("pipeline.agent.reasoning.get_todays_classified_articles")
def test_run_agent_reasoning_orchestrates_three_passes(
    mock_get_todays_classified, test_run_id
):
    articles = _build_reasoning_article_batch(test_run_id, count=15)
    urls = [article["url"] for article in articles]

    def _refresh_test_articles() -> list[dict]:
        return get_articles_by_urls(urls)

    mock_get_todays_classified.side_effect = _refresh_test_articles

    agent = ArticleAgent(batch_delay_seconds=0)
    result = run_agent_reasoning(articles, n=8, agent=agent)

    stored = get_articles_by_urls(urls)
    assert len(stored) == 15
    assert all(article["topic"] is not None for article in stored)
    assert all(article["importance_score"] is not None for article in stored)

    top_candidates = [
        article for article in stored if float(article["importance_score"]) >= 5
    ]
    assert top_candidates
    assert all(article["insight"] and article["key_takeaway"] for article in top_candidates)

    assert 7 <= len(result["articles"]) <= 10
    assert result["rationale"]
    input_order = [article["id"] for article in articles]
    selected_ids = result["selected_article_ids"]
    assert selected_ids != input_order[: len(selected_ids)]
    assert [article["id"] for article in result["articles"]] == selected_ids
