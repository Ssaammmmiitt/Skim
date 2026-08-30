from pipeline.compose import compose_digest
from pipeline.digest_preferences import (
    filter_articles_for_user,
    format_flags,
    normalize_theme,
)


def _sample_article() -> dict:
    return {
        "id": 1,
        "title": "OpenAI ships GPT-5",
        "url": "https://example.com/gpt5",
        "source": "techcrunch",
        "topic": "ai_ml",
        "summary": "A major model release for developers.",
        "insight": "This shifts the cost curve for agentic apps.",
        "key_takeaway": "Expect cheaper reasoning at scale.",
    }


def test_normalize_theme_defaults_to_cyan():
    assert normalize_theme(None) == "cyan"
    assert normalize_theme("bogus") == "cyan"
    assert normalize_theme("minimal") == "minimal"


def test_format_flags_headlines_hides_body():
    flags = format_flags("headlines")
    assert flags["show_insights"] is False
    assert flags["show_takeaways"] is False
    assert flags["show_read_more"] is False


def test_filter_articles_by_topic_and_max():
    articles = [
        {**_sample_article(), "topic": "ai_ml", "id": 1},
        {**_sample_article(), "topic": "web_dev", "id": 2},
        {**_sample_article(), "topic": "ai_ml", "id": 3},
    ]
    filtered = filter_articles_for_user(
        articles, topic_filters=["ai_ml"], max_stories=3
    )
    assert len(filtered) == 2
    assert filtered[0]["id"] == 1


def test_compose_digest_cyan_theme():
    html = compose_digest(
        [_sample_article()],
        theme="cyan",
        format_name="full",
    )
    assert "#0f1419" in html or "#06b6d4" in html
    assert "Skim" in html


def test_compose_digest_headlines_format():
    html = compose_digest(
        [_sample_article()],
        theme="classic",
        format_name="headlines",
    )
    assert "Read more" not in html
