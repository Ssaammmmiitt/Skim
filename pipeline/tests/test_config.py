import pytest
import requests

from pipeline.config import RSS_SOURCES, USER_AGENT

REQUEST_HEADERS = {"User-Agent": USER_AGENT}


@pytest.mark.parametrize("source", RSS_SOURCES, ids=lambda source: source["name"])
def test_rss_source_returns_valid_feed(source):
    response = requests.get(source["url"], headers=REQUEST_HEADERS, timeout=30)
    content_type = response.headers.get("content-type", "").lower()

    assert response.status_code == 200, source["url"]
    assert "xml" in content_type or "rss" in content_type or "atom" in content_type, (
        f"{source['name']}: unexpected content-type {content_type!r}"
    )
