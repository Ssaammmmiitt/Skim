import json
from unittest.mock import MagicMock

import pytest

from pipeline.summary_style import _parse_bullets_response, apply_summary_style

STORIES = [
    {"title": f"Story {i}", "summary": f"Summary {i}", "key_takeaway": f"Take {i}"}
    for i in range(1, 4)
]


def _llm_returning(content: str | None = None, error: Exception | None = None) -> MagicMock:
    llm = MagicMock(spec=["chat_with_tools"])
    if error:
        llm.chat_with_tools.side_effect = error
    else:
        llm.chat_with_tools.return_value = {"provider": "gemini", "content": content, "tool_calls": []}
    return llm


# ── _parse_bullets_response ───────────────────────────────────────────────────


def test_parses_valid_array():
    raw = '[{"id": 1, "bullets": ["a", "b", "c"]}]'
    assert _parse_bullets_response(raw) == [{"id": 1, "bullets": ["a", "b", "c"]}]


@pytest.mark.parametrize(
    "raw",
    [
        '```json\n[{"id": 1, "bullets": ["a"]}]\n```',
        '```\n[{"id": 1, "bullets": ["a"]}]\n```',
        '  \n```json\n[{"id": 1, "bullets": ["a"]}]\n```  \n',
    ],
)
def test_strips_markdown_fences(raw):
    assert _parse_bullets_response(raw) == [{"id": 1, "bullets": ["a"]}]


def test_salvages_valid_items_after_unescaped_quote():
    raw = (
        '[\n  {"id": 1, "bullets": ["a", "b"]},\n'
        '  {"id": 2, "bullets": ["the "Duo" phone", "x"]},\n'
        '  {"id": 3, "bullets": ["c"]}\n]'
    )
    assert [item["id"] for item in _parse_bullets_response(raw)] == [1, 3]


def test_salvages_items_with_missing_comma_between_objects():
    raw = '[{"id": 1, "bullets": ["a"]}\n{"id": 2, "bullets": ["b"]}]'
    assert [item["id"] for item in _parse_bullets_response(raw)] == [1, 2]


def test_salvages_items_from_truncated_response():
    raw = '[{"id": 1, "bullets": ["a"]}, {"id": 2, "bullets": ["b"]}, {"id": 3, "bull'
    assert [item["id"] for item in _parse_bullets_response(raw)] == [1, 2]


def test_salvages_items_wrapped_in_prose():
    raw = 'Here you go:\n[{"id": 1, "bullets": ["a"]}]\nHope this helps!'
    assert [item["id"] for item in _parse_bullets_response(raw)] == [1]


def test_bullets_containing_braces_parse_correctly():
    raw = '[{"id": 1, "bullets": ["uses {curly} braces", "b"]}]'
    assert _parse_bullets_response(raw)[0]["bullets"][0] == "uses {curly} braces"


def test_ignores_objects_without_id_or_bullets():
    raw = '[{"foo": 1}, {"id": 2, "bullets": ["b"]}, {"id": 3}] trailing'
    assert [item["id"] for item in _parse_bullets_response(raw)] == [2]


@pytest.mark.parametrize("raw", ["", "sorry, I can't do that", "[]garbage{", '{"id": 1}'])
def test_raises_when_nothing_parseable(raw):
    with pytest.raises(ValueError):
        _parse_bullets_response(raw)


def test_valid_empty_array_returns_empty_list():
    assert _parse_bullets_response("[]") == []


# ── apply_summary_style end to end ────────────────────────────────────────────


def test_bullet_points_injected_by_position():
    content = json.dumps([{"id": i, "bullets": [f"b{i}a", f"b{i}b", f"b{i}c", "extra"]} for i in (1, 2, 3)])
    result = apply_summary_style(STORIES, "bullet_points", _llm_returning(content))

    assert [s["bullet_points"] for s in result] == [
        ["b1a", "b1b", "b1c"],
        ["b2a", "b2b", "b2c"],
        ["b3a", "b3b", "b3c"],
    ]
    assert result[0]["title"] == "Story 1"


def test_malformed_response_keeps_salvaged_bullets():
    content = (
        '[{"id": 1, "bullets": ["ok1"]},\n'
        ' {"id": 2, "bullets": ["bad "quote" here"]},\n'
        ' {"id": 3, "bullets": ["ok3"]}]'
    )
    result = apply_summary_style(STORIES, "bullet_points", _llm_returning(content))
    assert [s["bullet_points"] for s in result] == [["ok1"], [], ["ok3"]]


def test_unparseable_response_falls_back_to_empty_bullets():
    result = apply_summary_style(STORIES, "bullet_points", _llm_returning("no json here"))
    assert all(s["bullet_points"] == [] for s in result)
    assert len(result) == 3


def test_llm_exception_falls_back_to_empty_bullets():
    result = apply_summary_style(STORIES, "bullet_points", _llm_returning(error=RuntimeError("503")))
    assert all(s["bullet_points"] == [] for s in result)


def test_empty_llm_content_falls_back_to_empty_bullets():
    result = apply_summary_style(STORIES, "bullet_points", _llm_returning(None))
    assert all(s["bullet_points"] == [] for s in result)


def test_bullet_points_without_llm_client_falls_back():
    result = apply_summary_style(STORIES, "bullet_points", None)
    assert all(s["bullet_points"] == [] for s in result)


@pytest.mark.parametrize("style", ["prose", "card", "unknown"])
def test_non_bullet_styles_make_no_llm_call(style):
    llm = _llm_returning("[]")
    result = apply_summary_style(STORIES, style, llm)
    llm.chat_with_tools.assert_not_called()
    assert all(s["bullet_points"] == [] for s in result)


def test_original_stories_are_not_mutated():
    content = json.dumps([{"id": 1, "bullets": ["x"]}])
    stories = [dict(STORIES[0])]
    apply_summary_style(stories, "bullet_points", _llm_returning(content))
    assert "bullet_points" not in stories[0]
