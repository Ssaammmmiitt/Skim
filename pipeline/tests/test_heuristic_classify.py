from pipeline.agent.heuristic_classify import (
    heuristic_classify_article,
    heuristic_classify_batch,
    infer_importance,
    infer_topic,
)
from pipeline.agent.tools import TOPIC_CATEGORIES


def test_infer_topic_ai_and_security():
    assert infer_topic("OpenAI launches GPT-5", "New LLM API for developers") == "ai_ml"
    assert (
        infer_topic("Critical CVE-2026-9999 in Apache", "Remote code execution")
        == "cybersecurity"
    )
    assert infer_topic("Kubernetes networking update", "Cloud operators guide") == (
        "cloud_infra"
    )


def test_infer_topic_defaults_to_other():
    assert infer_topic("Local bakery opens downtown", "Pastries and coffee") == "other"


def test_infer_importance_boosts_high_signal_and_cve():
    high = infer_importance(
        "Major zero-day exploit disclosed",
        "Critical vulnerability under active attack",
        source="bleeping_computer",
    )
    low = infer_importance(
        "Best gifts for dads coupon guide",
        "Discount codes and promo deals",
        source="wired",
    )
    cve = infer_importance("CVE-2026-1111 hits SharePoint", None, source="the_register")

    assert high >= 7
    assert low <= 4
    assert cve >= 7.5
    assert 1 <= high <= 10
    assert 1 <= low <= 10


def test_heuristic_classify_article_shape():
    result = heuristic_classify_article(
        {
            "id": 42,
            "title": "Anthropic Claude model update",
            "summary": "AI assistants get new tool use features",
            "source": "techcrunch",
        }
    )
    assert result["article_id"] == 42
    assert result["topic"] in TOPIC_CATEGORIES
    assert result["topic"] == "ai_ml"
    assert result["provider"] == "heuristic"
    assert "heuristic" in result["reasoning"]


def test_heuristic_classify_batch_preserves_order():
    articles = [
        {"id": 1, "title": "React 20 released", "summary": "Frontend framework", "source": "theverge"},
        {"id": 2, "title": "Startup raises Series B", "summary": "Venture funding", "source": "techcrunch"},
    ]
    results = heuristic_classify_batch(articles)
    assert [r["article_id"] for r in results] == [1, 2]
    assert results[0]["topic"] == "web_dev"
    assert results[1]["topic"] == "startups"
