import asyncio

import httpx

from pipeline.db import _strip_nul
from pipeline.models import Article
from pipeline.sources.extractor import _fetch_and_extract_single


def _run(article: Article, response: httpx.Response) -> None:
    transport = httpx.MockTransport(lambda request: response)

    async def go() -> None:
        async with httpx.AsyncClient(transport=transport) as client:
            await _fetch_and_extract_single(client, article)

    asyncio.run(go())


def test_pdf_response_falls_back_to_feed_snippet():
    article = Article(
        title="Paper", url="https://example.com/paper.pdf", source="hn", summary="Feed blurb"
    )
    pdf = httpx.Response(
        200,
        headers={"content-type": "application/pdf"},
        content=b"%PDF-1.7\x00\x00binary\x00<p>" + b"x" * 200 + b"</p>",
    )
    _run(article, pdf)
    assert article.raw_text == "Feed blurb"


def test_html_response_is_extracted():
    article = Article(title="Post", url="https://example.com/post", source="hn")
    body = "<html><body>" + "<p>" + "Real article text. " * 20 + "</p></body></html>"
    html = httpx.Response(200, headers={"content-type": "text/html; charset=utf-8"}, text=body)
    _run(article, html)
    assert article.raw_text and "Real article text." in article.raw_text


def test_strip_nul_removes_nul_bytes():
    assert _strip_nul("a\x00b\x00") == "ab"
    assert _strip_nul(None) is None
    assert _strip_nul("") == ""
