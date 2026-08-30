import json

import pytest

from pipeline.agent.llm_client import LLMClient
from pipeline.agent.tools import (
    ALL_TOOLS,
    CLASSIFY_ARTICLE,
    GENERATE_INSIGHT,
    PASS_TOOLS,
    SELECT_TOP_STORIES,
    TOPIC_CATEGORIES,
)

REQUIRED_TOOL_FIELDS = ("type", "function")
REQUIRED_FUNCTION_FIELDS = ("name", "description", "parameters")


@pytest.mark.parametrize(
    "tool,expected_name",
    [
        (CLASSIFY_ARTICLE, "classify_article"),
        (GENERATE_INSIGHT, "generate_insight"),
        (SELECT_TOP_STORIES, "select_top_stories"),
    ],
)
def test_tool_schema_structure(tool, expected_name):
    for field in REQUIRED_TOOL_FIELDS:
        assert field in tool
    assert tool["type"] == "function"

    function = tool["function"]
    for field in REQUIRED_FUNCTION_FIELDS:
        assert field in function
    assert function["name"] == expected_name

    parameters = function["parameters"]
    assert parameters["type"] == "object"
    assert parameters["required"]
    assert parameters["properties"]

    json.dumps(tool)


def test_classify_article_topic_enum_matches_schema():
    topic_property = CLASSIFY_ARTICLE["function"]["parameters"]["properties"]["topic"]
    assert topic_property["enum"] == TOPIC_CATEGORIES


def test_all_tools_contains_each_pass_tool():
    names = {tool["function"]["name"] for tool in ALL_TOOLS}
    assert names == {"classify_article", "generate_insight", "select_top_stories"}
    assert PASS_TOOLS["classify"] == [CLASSIFY_ARTICLE]
    assert PASS_TOOLS["insight"] == [GENERATE_INSIGHT]
    assert PASS_TOOLS["select"] == [SELECT_TOP_STORIES]


@pytest.mark.integration
@pytest.mark.parametrize("pass_name", ["classify", "insight", "select"])
def test_tool_schema_accepted_by_llm_client(pass_name):
    tool = PASS_TOOLS[pass_name][0]
    tool_name = tool["function"]["name"]
    client = LLMClient()
    result = client.chat_with_tools(
        messages=[
            {
                "role": "system",
                "content": f"Use the {tool_name} tool to respond.",
            },
            {
                "role": "user",
                "content": (
                    "Article 1: OpenAI releases a new GPT model for developers."
                ),
            },
        ],
        tools=[tool],
        tool_choice={"type": "function", "function": {"name": tool_name}},
    )

    assert result["tool_calls"]
    assert result["tool_calls"][0]["name"] == tool_name
    assert isinstance(result["tool_calls"][0]["arguments"], dict)
