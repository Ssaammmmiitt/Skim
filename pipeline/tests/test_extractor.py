import asyncio

import httpx
import pytest

from pipeline.db import _strip_nul
from pipeline.models import Article
from pipeline.sources.extractor import _fetch_and_extract_single, enrich_articles

ARTICLE_HTML = (
    "<html><head><meta property='og:description' content='OG blurb'></head><body>"
    "<article><p>" + "Real article text about kernels. " * 20 + "</p></article>"
    "</body></html>"
)


def _article(url: str = "https://example.com/post", **kwargs) -> Article:
    return Article(title="Post", url=url, source="hn", **kwargs)


def _run(article: Article, handler) -> list[httpx.Request]:
    requests: list[httpx.Request] = []

    def recording_handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return handler(request)

    async def go() -> None:
        transport = httpx.MockTransport(recording_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            await _fetch_and_extract_single(client, article)

    asyncio.run(go())
    return requests


def _respond(status: int = 200, content_type: str | None = "text/html", body: bytes | str = ARTICLE_HTML):
    headers = {"content-type": content_type} if content_type else {}
    content = body.encode() if isinstance(body, str) else body

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, headers=headers, content=content)

    return handler


PDF_BYTES = b"%PDF-1.7\n\x00\x00\xff\xfe binary \x00<p>" + b"x\x00" * 200 + b"</p>"


@pytest.mark.parametrize(
    "content_type",
    [
        "application/pdf",
        "application/octet-stream",
        "image/png",
        "video/mp4",
        "application/zip",
        "APPLICATION/PDF",
    ],
)
def test_non_html_content_falls_back_to_feed_snippet(content_type):
    article = _article("https://example.com/paper.pdf", summary="Feed blurb")
    _run(article, _respond(content_type=content_type, body=PDF_BYTES))
    assert article.raw_text == "Feed blurb"


def test_non_html_without_feed_summary_stores_empty_text():
    article = _article("https://example.com/paper.pdf")
    _run(article, _respond(content_type="application/pdf", body=PDF_BYTES))
    assert article.raw_text == ""
    assert "\x00" not in article.raw_text


@pytest.mark.parametrize(
    "content_type",
    [
        "text/html",
        "text/html; charset=utf-8",
        "application/xhtml+xml",
        "TEXT/HTML; charset=ISO-8859-1",
    ],
)
def test_html_like_content_is_extracted(content_type):
    article = _article()
    _run(article, _respond(content_type=content_type))
    assert article.raw_text and "Real article text about kernels." in article.raw_text


def test_missing_content_type_is_treated_as_html():
    article = _article()
    _run(article, _respond(content_type=None))
    assert article.raw_text and "Real article text" in article.raw_text


def test_short_page_falls_back_to_og_description():
    article = _article(summary="Feed blurb")
    html = "<html><head><meta property='og:description' content='OG blurb'></head><body><p>Hi</p></body></html>"
    _run(article, _respond(body=html))
    assert article.raw_text == "OG blurb"


def test_empty_page_falls_back_to_feed_snippet():
    article = _article(summary="Feed blurb")
    _run(article, _respond(body="<html><body></body></html>"))
    assert article.raw_text == "Feed blurb"


@pytest.mark.parametrize("status", [401, 403, 404, 500, 503])
def test_http_errors_fall_back_to_feed_snippet(status):
    article = _article(summary="Feed blurb")
    _run(article, _respond(status=status))
    assert article.raw_text == "Feed blurb"


def test_network_error_falls_back_to_feed_snippet():
    article = _article(summary="Feed blurb")

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom", request=request)

    _run(article, handler)
    assert article.raw_text == "Feed blurb"


def test_redirect_to_pdf_is_skipped():
    article = _article("https://example.com/paper", summary="Feed blurb")

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/paper":
            return httpx.Response(301, headers={"location": "https://example.com/paper.pdf"})
        return httpx.Response(200, headers={"content-type": "application/pdf"}, content=PDF_BYTES)

    requests = _run(article, handler)
    assert len(requests) == 2
    assert article.raw_text == "Feed blurb"


def test_existing_raw_text_skips_fetch():
    article = _article(raw_text="already extracted")
    requests = _run(article, _respond())
    assert requests == []
    assert article.raw_text == "already extracted"


def test_enrich_articles_handles_mixed_batch(monkeypatch):
    articles = [
        _article("https://example.com/html", summary="s1"),
        _article("https://example.com/doc.pdf", summary="s2"),
        _article("https://example.com/gone", summary="s3"),
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/html":
            return httpx.Response(200, headers={"content-type": "text/html"}, text=ARTICLE_HTML)
        if request.url.path == "/doc.pdf":
            return httpx.Response(200, headers={"content-type": "application/pdf"}, content=PDF_BYTES)
        return httpx.Response(404)

    real_client = httpx.AsyncClient

    def fake_client(*args, **kwargs):
        kwargs.pop("limits", None)
        return real_client(*args, transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr("pipeline.sources.extractor.httpx.AsyncClient", fake_client)
    enrich_articles(articles)

    assert "Real article text" in articles[0].raw_text
    assert articles[1].raw_text == "s2"
    assert articles[2].raw_text == "s3"
    assert all("\x00" not in a.raw_text for a in articles)


def test_enrich_articles_empty_list_is_noop():
    enrich_articles([])


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("a\x00b\x00", "ab"),
        ("\x00\x00", ""),
        ("clean text", "clean text"),
        ("unicode ✓ \x00 ok", "unicode ✓  ok"),
        ("", ""),
        (None, None),
    ],
)
def test_strip_nul(value, expected):
    assert _strip_nul(value) == expected
