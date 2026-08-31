from unittest.mock import patch

import pytest

from pipeline.main import run_pipeline


def _article(article_id: int, title: str) -> dict:
    return {
        "id": article_id,
        "title": title,
        "url": f"https://example.com/{article_id}",
        "source": "hackernews",
        "summary": f"Summary for {title}",
    }


DEFAULT_SUBSCRIBER = {
    "email": "reader@example.com",
    "theme": "cyan",
    "format": "full",
    "max_stories": 8,
    "topic_filters": None,
}


@pytest.fixture
def pipeline_mocks():
    patches = {
        "digest_already_sent": patch(
            "pipeline.main.digest_already_sent", return_value=False
        ),
        "record_pipeline_start": patch(
            "pipeline.main.record_pipeline_start", return_value=1
        ),
        "record_pipeline_complete": patch("pipeline.main.record_pipeline_complete"),
        "record_digest_sent": patch("pipeline.main.record_digest_sent"),
        "mark_articles_digest_date": patch("pipeline.main.mark_articles_digest_date"),
        "get_digest_subscribers": patch(
            "pipeline.main.get_digest_subscribers",
            return_value=[DEFAULT_SUBSCRIBER],
        ),
        "send_email": patch("pipeline.main.send_email", return_value=True),
        "ingest_all_sources": patch("pipeline.main.ingest_all_sources"),
        "embed_all_articles": patch("pipeline.main.embed_all_articles", return_value=0),
        "select_digest_articles": patch("pipeline.main.select_digest_articles"),
    }
    started = {name: p.start() for name, p in patches.items()}
    yield started
    for p in patches.values():
        p.stop()


def test_run_pipeline_sends_fallback_digest_on_llm_failure(pipeline_mocks):
    pipeline_mocks["ingest_all_sources"].return_value = [_article(1, "HN story")]
    pipeline_mocks["select_digest_articles"].return_value = (
        [{**_article(1, "HN story"), "insight": None, "key_takeaway": None}],
        "Simplified digest",
        True,
    )

    run_pipeline()

    pipeline_mocks["send_email"].assert_called_once()
    html = pipeline_mocks["send_email"].call_args.kwargs["html"]
    assert "HN story" in html
    assert "Summary for HN story" in html
    pipeline_mocks["record_digest_sent"].assert_called_once()
    pipeline_mocks["record_pipeline_complete"].assert_called_once()
    assert (
        pipeline_mocks["record_pipeline_complete"].call_args.kwargs["status"]
        == "partial"
    )


def test_run_pipeline_sends_quiet_day_digest(pipeline_mocks):
    pipeline_mocks["ingest_all_sources"].return_value = []
    pipeline_mocks["select_digest_articles"].return_value = ([], "", True)

    run_pipeline()

    html = pipeline_mocks["send_email"].call_args.kwargs["html"]
    assert "Quiet day" in html
    pipeline_mocks["record_digest_sent"].assert_called_once()


def test_run_pipeline_continues_when_embedding_fails(pipeline_mocks):
    pipeline_mocks["ingest_all_sources"].return_value = [_article(1, "Story")]
    pipeline_mocks["embed_all_articles"].side_effect = RuntimeError("embed down")
    pipeline_mocks["select_digest_articles"].return_value = (
        [_article(1, "Story")],
        "Editor note",
        False,
    )

    run_pipeline()

    pipeline_mocks["send_email"].assert_called_once()
    pipeline_mocks["record_pipeline_complete"].assert_called_once()
    assert (
        pipeline_mocks["record_pipeline_complete"].call_args.kwargs["articles_embedded"]
        == 0
    )


def test_run_pipeline_exits_when_digest_already_sent(pipeline_mocks):
    pipeline_mocks["digest_already_sent"].return_value = True

    run_pipeline()

    pipeline_mocks["ingest_all_sources"].assert_not_called()
    pipeline_mocks["send_email"].assert_not_called()


def test_run_pipeline_raises_and_records_failure_when_ingest_crashes(pipeline_mocks):
    pipeline_mocks["ingest_all_sources"].side_effect = RuntimeError("ingest down")

    with pytest.raises(RuntimeError, match="ingest down"):
        run_pipeline()

    pipeline_mocks["record_pipeline_complete"].assert_called_once()
    assert (
        pipeline_mocks["record_pipeline_complete"].call_args.kwargs["status"]
        == "failed"
    )
    pipeline_mocks["send_email"].assert_not_called()
