import pytest

from pipeline.agent.llm_client import LLMClient
from pipeline.agent.prompts import (
    CLASSIFICATION_SYSTEM_PROMPT,
    INSIGHT_SYSTEM_PROMPT,
    PASS_FEW_SHOT_EXAMPLES,
    PASS_MESSAGE_BUILDERS,
    PASS_SYSTEM_PROMPTS,
    SELECTION_SYSTEM_PROMPT,
    build_classification_messages,
    build_insight_messages,
    build_selection_messages,
    format_articles_for_classification,
    format_articles_for_insight,
    format_articles_for_selection,
)
from pipeline.agent.tools import PASS_TOOLS

SAMPLE_ARTICLES = [
    {
        "id": 1,
        "title": "OpenAI releases a new GPT model",
        "source": "techcrunch",
        "summary": "The model improves coding and reasoning benchmarks.",
        "topic": "ai_ml",
        "importance_score": 8,
    },
    {
        "id": 2,
        "title": "React team ships minor docs update",
        "source": "hackernews",
        "summary": "Documentation clarifies server component patterns.",
        "topic": "web_dev",
        "importance_score": 4,
    },
]


@pytest.mark.parametrize(
    "prompt,tool_name",
    [
        (CLASSIFICATION_SYSTEM_PROMPT, "classify_article"),
        (INSIGHT_SYSTEM_PROMPT, "generate_insight"),
        (SELECTION_SYSTEM_PROMPT, "select_top_stories"),
    ],
)
def test_system_prompts_reference_expected_tool(prompt, tool_name):
    assert tool_name in prompt
    assert len(prompt) > 100


def test_pass_prompt_and_few_shot_exports():
    assert set(PASS_SYSTEM_PROMPTS) == {"classify", "insight", "select"}
    assert set(PASS_FEW_SHOT_EXAMPLES) == {"classify", "insight", "select"}
    assert set(PASS_MESSAGE_BUILDERS) == {"classify", "insight", "select"}
    for pass_name, examples in PASS_FEW_SHOT_EXAMPLES.items():
        assert examples, f"{pass_name} should have few-shot examples"
        for example in examples:
            assert "user" in example
            assert example["tool_calls"]
            assert example["tool_calls"][0]["name"] == PASS_TOOLS[pass_name][0]["function"]["name"]


def test_format_articles_for_classification_includes_ids_and_summaries():
    text = format_articles_for_classification(SAMPLE_ARTICLES)
    assert "Article 1:" in text
    assert "OpenAI releases a new GPT model" in text
    assert "Source: techcrunch" in text


def test_format_articles_for_insight_includes_topic_and_score():
    text = format_articles_for_insight([SAMPLE_ARTICLES[0]])
    assert "Topic: ai_ml" in text
    assert "Importance: 8" in text


def test_format_articles_for_selection_lists_classified_rows():
    text = format_articles_for_selection(SAMPLE_ARTICLES)
    assert "ID 1 | ai_ml | score 8" in text
    assert "ID 2 | web_dev | score 4" in text


@pytest.mark.parametrize(
    "builder,expected_article_text",
    [
        (build_classification_messages, "Article 1:"),
        (build_insight_messages, "Topic: ai_ml"),
        (build_selection_messages, "ID 1 | ai_ml"),
    ],
)
def test_message_builders_include_system_prompt_few_shots_and_user_payload(
    builder, expected_article_text
):
    messages = builder(SAMPLE_ARTICLES)
    assert messages[0]["role"] == "system"
    assert messages[-1]["role"] == "user"
    assert expected_article_text in messages[-1]["content"]
    assert any(message["role"] == "assistant" for message in messages)


@pytest.mark.integration
@pytest.mark.parametrize("pass_name", ["classify", "insight", "select"])
def test_prompts_produce_valid_tool_calls_with_live_llm(pass_name):
    client = LLMClient()
    messages = PASS_MESSAGE_BUILDERS[pass_name](SAMPLE_ARTICLES)
    tool = PASS_TOOLS[pass_name][0]
    tool_name = tool["function"]["name"]

    result = client.chat_with_tools(
        messages=messages,
        tools=[tool],
        tool_choice={"type": "function", "function": {"name": tool_name}},
    )

    assert result["tool_calls"]
    assert result["tool_calls"][0]["name"] == tool_name
    assert isinstance(result["tool_calls"][0]["arguments"], dict)
