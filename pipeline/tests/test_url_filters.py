from pipeline.url_filters import (
    is_junk_url,
    looks_like_html,
    prioritize_for_classify,
)


def test_looks_like_html_detects_markup():
    assert looks_like_html("<p>Hello</p>")
    assert looks_like_html("Intro <br/> more")


def test_looks_like_html_rejects_plain_and_pathlike():
    assert not looks_like_html("")
    assert not looks_like_html("plain summary text")
    assert not looks_like_html("path/to/something")
    assert not looks_like_html("phoronix")


def test_is_junk_url_youtube_and_promo():
    assert is_junk_url("https://youtube.com/watch?v=abc123")
    assert is_junk_url("https://www.youtube.com/watch?v=abc123")
    assert is_junk_url("https://youtu.be/abc123")
    assert is_junk_url("https://www.wired.com/story/hoka-coupon-code")
    assert is_junk_url("https://wired.com/story/vistaprint-promo-code")
    assert is_junk_url("https://example.com/path/discount-code/foo")
    assert is_junk_url("https://greasyfork.org/en/scripts?by=1")


def test_is_junk_url_allows_normal_articles():
    assert not is_junk_url("https://techcrunch.com/2026/09/25/openai-news/")
    assert not is_junk_url("https://arstechnica.com/ai/2026/09/something/")
    assert not is_junk_url("https://github.com/git-bug/git-bug")


def test_prioritize_for_classify_prefers_editorial_sources():
    articles = [
        {"id": 1, "source": "hackernews"},
        {"id": 2, "source": "techcrunch"},
        {"id": 3, "source": "random_blog"},
        {"id": 4, "source": "arstechnica"},
    ]
    capped = prioritize_for_classify(articles, limit=2)
    assert [a["source"] for a in capped] == ["techcrunch", "arstechnica"]


def test_prioritize_for_classify_respects_limit():
    articles = [{"id": i, "source": "techcrunch"} for i in range(10)]
    assert len(prioritize_for_classify(articles, 3)) == 3
    assert prioritize_for_classify(articles, 0) == []
