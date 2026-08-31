from pipeline.compose import compose_digest


def _sample_article(**overrides):
    base = {
        "id": 1,
        "title": "OpenAI ships GPT-5",
        "url": "https://example.com/gpt5",
        "source": "techcrunch",
        "topic": "ai_ml",
        "importance_score": 9,
        "summary": "Major model release for developers.",
        "insight": "This shifts how teams budget inference costs for agent workflows.",
        "key_takeaway": "Revisit inference cost assumptions.",
    }
    base.update(overrides)
    return base


def test_compose_digest_renders_stories():
    html = compose_digest([_sample_article()], stats={"articles_ingested": 5})

    assert "OpenAI ships GPT-5" in html
    assert "Revisit inference cost assumptions." in html
    assert "https://example.com/gpt5" in html
    assert "AI/ML" in html
    assert "5 ingested" in html


def test_compose_digest_renders_rationale():
    html = compose_digest(
        [_sample_article()],
        rationale="Lead with the highest-impact AI story.",
    )

    assert "Editor's note:" in html
    assert "highest-impact AI story" in html


def test_compose_digest_empty_stories_shows_quiet_day():
    html = compose_digest([])

    assert "Quiet day" in html
    assert "0 stories" in html


def test_compose_digest_falls_back_to_summary_without_insight():
    article = _sample_article(insight=None, key_takeaway=None)
    html = compose_digest([article])

    assert "Major model release for developers." in html
    assert "OpenAI ships GPT-5" in html


def test_compose_digest_multiple_stories_numbered():
    articles = [
        _sample_article(id=1, title="Story One"),
        _sample_article(id=2, title="Story Two"),
    ]
    html = compose_digest(articles)

    assert "#1" in html
    assert "#2" in html
    assert "Story One" in html
    assert "Story Two" in html


def test_compose_digest_brief_format_omits_insight_body():
    html = compose_digest(
        [_sample_article()],
        format_name="brief",
    )

    assert "OpenAI ships GPT-5" in html
    assert "Revisit inference cost assumptions." in html
    assert "shifts how teams budget inference" not in html


def test_compose_digest_headlines_format_shows_title_only():
    html = compose_digest(
        [_sample_article()],
        format_name="headlines",
    )

    assert "OpenAI ships GPT-5" in html
    assert "Major model release for developers." not in html
    assert "Revisit inference cost assumptions." not in html
