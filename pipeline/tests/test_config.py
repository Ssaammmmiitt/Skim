import logging

import pytest
import requests

from pipeline.config import LOG_DATE_FORMAT, LOG_FORMAT, RSS_SOURCES, USER_AGENT, configure_logging

REQUEST_HEADERS = {"User-Agent": USER_AGENT}


def test_configure_logging_sets_level():
    configure_logging("DEBUG")
    assert logging.getLogger().level == logging.DEBUG


def test_configure_logging_respects_log_level_env(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    configure_logging()
    assert logging.getLogger().level == logging.ERROR


def test_configure_logging_applies_structured_formatter():
    configure_logging()
    handler = logging.getLogger().handlers[0]
    assert handler.formatter is not None
    assert handler.formatter._fmt == LOG_FORMAT
    assert handler.formatter.datefmt == LOG_DATE_FORMAT


def test_log_records_include_module_name(caplog):
    configure_logging()
    caplog.set_level(logging.INFO)
    logging.getLogger("pipeline.tests.logging_probe").info("structured probe")

    assert any(record.name == "pipeline.tests.logging_probe" for record in caplog.records)
    assert any(record.levelname == "INFO" for record in caplog.records)
    assert any("structured probe" in record.message for record in caplog.records)


@pytest.mark.integration
@pytest.mark.parametrize("source", RSS_SOURCES, ids=lambda source: source["name"])
def test_rss_source_returns_valid_feed(source):
    response = requests.get(source["url"], headers=REQUEST_HEADERS, timeout=30)
    content_type = response.headers.get("content-type", "").lower()

    assert response.status_code == 200, source["url"]
    assert "xml" in content_type or "rss" in content_type or "atom" in content_type, (
        f"{source['name']}: unexpected content-type {content_type!r}"
    )
