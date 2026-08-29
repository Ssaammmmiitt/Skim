from pipeline.sources.base import normalize_url


def test_normalize_strips_tracking_params_and_www():
    assert (
        normalize_url("https://www.example.com/article?utm_source=twitter&ref=home")
        == "https://example.com/article"
    )


def test_normalize_lowercases_host():
    assert normalize_url("https://Example.COM/path/") == "https://example.com/path/"


def test_normalize_resolves_duplicate_hn_links():
    url_a = "https://www.example.com/story?utm_source=hackernews"
    url_b = "https://example.com/story?ref=home"

    assert normalize_url(url_a) == normalize_url(url_b)
