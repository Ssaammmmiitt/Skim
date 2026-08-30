"""System prompts and few-shot examples for the agent reasoning pipeline."""

from __future__ import annotations

from typing import Any

CLASSIFICATION_SYSTEM_PROMPT = """You are a senior tech editor at a leading technology publication.
Your job is to classify incoming news articles by topic and rate their importance to a
professional software engineer who works in AI/ML and full-stack development.

Importance scale:
- 1-2: Routine news, minor updates, not worth reading
- 3-4: Somewhat interesting but not urgent
- 5-6: Notable, worth knowing about
- 7-8: Significant development, will affect the industry
- 9-10: Groundbreaking, paradigm-shifting, everyone should know

Be rigorous. Most articles are 3-5. Reserve 8+ for truly exceptional news.
Use the classify_article tool for EACH article provided."""

INSIGHT_SYSTEM_PROMPT = """You are a senior tech analyst writing for experienced engineers.
For each article, generate a concise insight that explains WHY this matters — not just
what happened, but what it means for practitioners. Be specific and opinionated.
Avoid generic statements like "this is interesting" or "time will tell."
Use the generate_insight tool for each article."""

SELECTION_SYSTEM_PROMPT = """You are the editor-in-chief composing today's digest.
From the classified articles, select the 7-10 most important ones and order them
for maximum reader impact. Consider:
- Diversity of topics (don't pick 8 AI articles if there's good web dev news)
- A mix of "big news" and "useful to know" items
- Lead with the highest-impact story
Use the select_top_stories tool with your final selection."""

PASS_SYSTEM_PROMPTS = {
    "classify": CLASSIFICATION_SYSTEM_PROMPT,
    "insight": INSIGHT_SYSTEM_PROMPT,
    "select": SELECTION_SYSTEM_PROMPT,
}

CLASSIFICATION_FEW_SHOT_EXAMPLES: list[dict[str, Any]] = [
    {
        "user": (
            "Article 101:\n"
            "Title: Patch Tuesday ships routine Windows security updates\n"
            "Source: arstechnica\n"
            "Summary: Microsoft released its monthly security patches with no major zero-days disclosed."
        ),
        "tool_calls": [
            {
                "name": "classify_article",
                "arguments": {
                    "article_id": 101,
                    "topic": "cybersecurity",
                    "importance_score": 3,
                    "reasoning": (
                        "Routine monthly patches are expected maintenance, not a story "
                        "engineers need to act on immediately."
                    ),
                },
            }
        ],
    },
    {
        "user": (
            "Article 102:\n"
            "Title: OpenAI releases GPT-5 with native agent tooling for developers\n"
            "Source: techcrunch\n"
            "Summary: The new model supports multi-step tool use and cuts latency for coding agents by 40%."
        ),
        "tool_calls": [
            {
                "name": "classify_article",
                "arguments": {
                    "article_id": 102,
                    "topic": "ai_ml",
                    "importance_score": 9,
                    "reasoning": (
                        "A major foundation-model release with agent tooling directly affects "
                        "how engineers build AI products."
                    ),
                },
            }
        ],
    },
]

INSIGHT_FEW_SHOT_EXAMPLES: list[dict[str, Any]] = [
    {
        "user": (
            "Article 201:\n"
            "Title: Cloud provider cuts egress fees by 80%\n"
            "Source: theverge\n"
            "Summary: A major hyperscaler announced steep egress price cuts after EU scrutiny."
        ),
        "tool_calls": [
            {
                "name": "generate_insight",
                "arguments": {
                    "article_id": 201,
                    "insight": (
                        "Egress fees have quietly inflated multi-cloud and data-heavy architectures for years. "
                        "If this sticks, teams can finally colocate analytics near storage without "
                        "budget blowups — revisit any 'single-region only' cost assumptions."
                    ),
                    "key_takeaway": "Lower egress may unlock cheaper multi-region data pipelines.",
                },
            }
        ],
    },
]

SELECTION_FEW_SHOT_EXAMPLES: list[dict[str, Any]] = [
    {
        "user": (
            "Today's classified articles:\n"
            "- ID 301 | ai_ml | score 9 | OpenAI ships GPT-5 with agent tooling\n"
            "- ID 302 | ai_ml | score 7 | Anthropic expands Claude context window\n"
            "- ID 303 | web_dev | score 6 | React 20 adds server components improvements\n"
            "- ID 304 | programming | score 4 | Minor TypeScript 5.9 patch release\n"
            "- ID 305 | cloud_infra | score 8 | AWS announces major S3 pricing change\n"
            "- ID 306 | startups | score 5 | YC demo day highlights 3 AI infra startups"
        ),
        "tool_calls": [
            {
                "name": "select_top_stories",
                "arguments": {
                    "selected_article_ids": [301, 305, 302, 306, 303],
                    "rationale": (
                        "Lead with GPT-5 as the highest-impact story, follow with the AWS pricing "
                        "shift, then balance AI depth with startup and web-dev coverage while "
                        "dropping the routine TypeScript patch."
                    ),
                },
            }
        ],
    },
]

PASS_FEW_SHOT_EXAMPLES = {
    "classify": CLASSIFICATION_FEW_SHOT_EXAMPLES,
    "insight": INSIGHT_FEW_SHOT_EXAMPLES,
    "select": SELECTION_FEW_SHOT_EXAMPLES,
}


def format_articles_for_classification(articles: list[dict[str, Any]]) -> str:
    blocks = []
    for article in articles:
        blocks.append(
            "\n".join(
                [
                    f"Article {article['id']}:",
                    f"Title: {article['title']}",
                    f"Source: {article['source']}",
                    f"Summary: {article.get('summary') or '(no summary)'}",
                ]
            )
        )
    return "\n\n".join(blocks)


def format_articles_for_insight(articles: list[dict[str, Any]]) -> str:
    blocks = []
    for article in articles:
        topic = article.get("topic", "unknown")
        score = article.get("importance_score", "n/a")
        blocks.append(
            "\n".join(
                [
                    f"Article {article['id']}:",
                    f"Title: {article['title']}",
                    f"Source: {article['source']}",
                    f"Topic: {topic} | Importance: {score}",
                    f"Summary: {article.get('summary') or '(no summary)'}",
                ]
            )
        )
    return "\n\n".join(blocks)


def format_articles_for_selection(articles: list[dict[str, Any]]) -> str:
    lines = ["Today's classified articles:"]
    for article in articles:
        lines.append(
            "- ID {id} | {topic} | score {score} | {title}".format(
                id=article["id"],
                topic=article.get("topic", "unknown"),
                score=article.get("importance_score", "n/a"),
                title=article["title"],
            )
        )
    return "\n".join(lines)


def _append_few_shot_examples(
    messages: list[dict[str, Any]], examples: list[dict[str, Any]]
) -> None:
    for example in examples:
        messages.append({"role": "user", "content": example["user"]})
        messages.append(
            {
                "role": "assistant",
                "content": "",
                "tool_calls": example["tool_calls"],
            }
        )


def build_classification_messages(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT}
    ]
    _append_few_shot_examples(messages, CLASSIFICATION_FEW_SHOT_EXAMPLES)
    messages.append(
        {
            "role": "user",
            "content": format_articles_for_classification(articles),
        }
    )
    return messages


def build_insight_messages(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": INSIGHT_SYSTEM_PROMPT}]
    _append_few_shot_examples(messages, INSIGHT_FEW_SHOT_EXAMPLES)
    messages.append(
        {
            "role": "user",
            "content": format_articles_for_insight(articles),
        }
    )
    return messages


def build_selection_messages(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SELECTION_SYSTEM_PROMPT}]
    _append_few_shot_examples(messages, SELECTION_FEW_SHOT_EXAMPLES)
    messages.append(
        {
            "role": "user",
            "content": format_articles_for_selection(articles),
        }
    )
    return messages


PASS_MESSAGE_BUILDERS = {
    "classify": build_classification_messages,
    "insight": build_insight_messages,
    "select": build_selection_messages,
}
