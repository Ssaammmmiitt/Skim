"""DB-free tests for batch classification across providers."""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from pipeline.agent.llm_client import LLMClient
from pipeline.agent.reasoning import ArticleAgent
from pipeline.agent.tools import CLASSIFY_ARTICLE

TOPICS = ["ai_ml", "cybersecurity", "cloud_infra", "ai_ml", "cybersecurity"]


def _articles(n: int = 5) -> list[dict]:
    return [
        {
            "id": 1000 + i,
            "title": f"Article {i}",
            "url": f"https://example.com/{i}",
            "source": "techcrunch",
            "summary": "Summary",
        }
        for i in range(n)
    ]


def _tool_call(article_id: int, topic: str = "ai_ml", score: float = 7) -> dict:
    return {
        "id": f"call_{article_id}",
        "name": "classify_article",
        "arguments": {
            "article_id": article_id,
            "topic": topic,
            "importance_score": score,
            "reasoning": "test",
        },
    }


def _mock_llm(response: dict) -> MagicMock:
    llm = MagicMock()
    llm.chat_with_tools.return_value = response
    llm._model_router = MagicMock(using_fallback=False)
    llm._gemini_exhausted = False
    return llm


@pytest.fixture(autouse=True)
def _no_db():
    with patch("pipeline.agent.reasoning.update_article_classification") as update:
        yield update


@pytest.mark.parametrize("provider", ["gemini", "groq"])
def test_full_batch_classified_by_llm_without_heuristic(provider, _no_db):
    articles = _articles()
    llm = _mock_llm(
        {
            "provider": provider,
            "content": None,
            "tool_calls": [_tool_call(a["id"], TOPICS[i]) for i, a in enumerate(articles)],
        }
    )
    agent = ArticleAgent(llm=llm, batch_size=5, batch_delay_seconds=0)

    results = agent.classify_batch(articles)

    assert len(results) == 5
    assert {r["provider"] for r in results} == {provider}
    assert _no_db.call_count == 5
    kwargs = llm.chat_with_tools.call_args.kwargs
    assert kwargs["tool_choice"] == "required"
    assert kwargs["tools"] == [CLASSIFY_ARTICLE]


def test_invalid_tool_calls_are_filled_by_heuristic():
    articles = _articles()
    calls = [
        _tool_call(articles[0]["id"], "ai_ml"),
        _tool_call(articles[1]["id"], "not_a_topic"),
        _tool_call(articles[2]["id"], "ai_ml", score=42),
        _tool_call(99999, "ai_ml"),
    ]
    llm = _mock_llm({"provider": "groq", "content": None, "tool_calls": calls})
    agent = ArticleAgent(llm=llm, batch_size=5, batch_delay_seconds=0)

    results = agent.classify_batch(articles)

    by_id = {r["article_id"]: r for r in results}
    assert set(by_id) == {a["id"] for a in articles}
    assert by_id[articles[0]["id"]]["provider"] == "groq"
    for a in articles[1:]:
        assert by_id[a["id"]]["provider"] == "heuristic"


def test_duplicate_tool_calls_for_same_article_are_not_double_counted(_no_db):
    articles = _articles(2)
    calls = [
        _tool_call(articles[0]["id"], "ai_ml", 7),
        _tool_call(articles[0]["id"], "cybersecurity", 9),
        _tool_call(articles[1]["id"], "cloud_infra", 5),
    ]
    llm = _mock_llm({"provider": "groq", "content": None, "tool_calls": calls})
    agent = ArticleAgent(llm=llm, batch_size=5, batch_delay_seconds=0)

    results = agent.classify_batch(articles)

    assert sorted(r["article_id"] for r in results) == sorted(a["id"] for a in articles)
    by_id = {r["article_id"]: r for r in results}
    assert by_id[articles[0]["id"]]["topic"] == "ai_ml"
    assert _no_db.call_count == 2


# ── Provider translation of tool_choice="required" ───────────────────────────


def _groq_response(article_ids: list[int]) -> SimpleNamespace:
    tool_calls = [
        SimpleNamespace(
            id=f"call_{aid}",
            function=SimpleNamespace(
                name="classify_article",
                arguments=json.dumps(
                    {"article_id": aid, "topic": "ai_ml", "importance_score": 6, "reasoning": "r"}
                ),
            ),
        )
        for aid in article_ids
    ]
    message = SimpleNamespace(content=None, tool_calls=tool_calls)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def test_groq_receives_required_and_returns_all_parallel_calls():
    groq = MagicMock()
    groq.chat.completions.create.return_value = _groq_response([1, 2, 3, 4, 5])
    client = LLMClient(gemini_client=MagicMock(), groq_client=groq)

    response = client.chat_with_tools(
        messages=[{"role": "user", "content": "classify"}],
        tools=[CLASSIFY_ARTICLE],
        tool_choice="required",
        prefer_groq=True,
    )

    assert groq.chat.completions.create.call_args.kwargs["tool_choice"] == "required"
    assert response["provider"] == "groq"
    assert [c["arguments"]["article_id"] for c in response["tool_calls"]] == [1, 2, 3, 4, 5]


def test_gemini_maps_required_to_function_calling_mode_any():
    gemini = MagicMock()
    parts = [
        SimpleNamespace(
            text=None,
            function_call=SimpleNamespace(
                name="classify_article",
                args={"article_id": aid, "topic": "ai_ml", "importance_score": 6},
            ),
        )
        for aid in (1, 2, 3)
    ]
    gemini.models.generate_content.return_value = SimpleNamespace(
        candidates=[SimpleNamespace(content=SimpleNamespace(parts=parts))]
    )
    client = LLMClient(gemini_client=gemini, groq_client=MagicMock())
    client._model_router.reset()

    response = client.chat_with_tools(
        messages=[{"role": "user", "content": "classify"}],
        tools=[CLASSIFY_ARTICLE],
        tool_choice="required",
    )

    config = gemini.models.generate_content.call_args.kwargs["config"]
    assert str(config.tool_config.function_calling_config.mode).endswith("ANY")
    assert len(response["tool_calls"]) == 3
