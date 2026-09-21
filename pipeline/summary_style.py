"""
Summary style post-processor for Skim digest emails.

This module adds a thin post-processing layer at compose time.
It does NOT modify any existing pipeline stages.

Design principles:
- prose        → zero LLM calls (returns stories unchanged)
- bullet_points → ONE batched LLM call for all stories (not one per story)
- card         → zero LLM calls (restructures existing fields client-side)

The batched prompt strategy means bullet_points mode adds minimal latency
(one extra API call per subscriber) while keeping LLM costs low.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


# ── Bullet-point extraction ────────────────────────────────────────────────────

_BULLET_PROMPT_TEMPLATE = """You are a news digest formatter. For each article below, extract exactly 3 concise bullet points that capture the key facts. Be specific and factual — no generic statements.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
[
  {{"id": 1, "bullets": ["...", "...", "..."]}},
  {{"id": 2, "bullets": ["...", "...", "..."]}}
]

Articles:
{articles_json}"""


def _build_article_inputs(stories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extract only the fields needed for bullet generation (minimize tokens)."""
    return [
        {
            "id": i + 1,
            "title": story.get("title", ""),
            "summary": story.get("summary") or story.get("insight") or "",
            "key_takeaway": story.get("key_takeaway") or "",
        }
        for i, story in enumerate(stories)
    ]


def _call_llm_for_bullets(
    stories: list[dict[str, Any]], llm_client: Any
) -> list[dict[str, Any]]:
    """
    Make a single batched LLM call to extract bullet points for all stories.

    Returns a list of stories with 'bullet_points' injected.
    Falls back to the original stories (without bullets) on any error.
    """
    if not stories:
        return stories

    article_inputs = _build_article_inputs(stories)
    prompt = _BULLET_PROMPT_TEMPLATE.format(
        articles_json=json.dumps(article_inputs, ensure_ascii=False, indent=2)
    )

    try:
        # Support both Gemini and Groq client interfaces
        raw_response = _invoke_llm(llm_client, prompt)
        parsed = json.loads(raw_response)

        if not isinstance(parsed, list):
            raise ValueError("LLM response is not a JSON array")

        # Index bullets by position (1-based id in the prompt)
        bullet_map: dict[int, list[str]] = {}
        for item in parsed:
            if isinstance(item, dict) and "id" in item and "bullets" in item:
                item_id = int(item["id"])
                bullets = [str(b) for b in item["bullets"] if b][:3]
                if bullets:
                    bullet_map[item_id] = bullets

        # Inject bullet_points into stories (matched by position)
        enriched: list[dict[str, Any]] = []
        for i, story in enumerate(stories):
            enriched_story = dict(story)
            enriched_story["bullet_points"] = bullet_map.get(i + 1, [])
            enriched.append(enriched_story)

        logger.info(
            "[summary_style] bullet extraction succeeded for %d/%d stories",
            sum(1 for s in enriched if s.get("bullet_points")),
            len(stories),
        )
        return enriched

    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        logger.warning(
            "[summary_style] bullet extraction parse error: %s — falling back to prose",
            exc,
        )
        return _add_empty_bullets(stories)
    except Exception as exc:
        logger.warning(
            "[summary_style] bullet extraction LLM error: %s — falling back to prose",
            exc,
        )
        return _add_empty_bullets(stories)


def _invoke_llm(llm_client: Any, prompt: str) -> str:
    """
    Unified LLM invocation that handles Gemini, Groq, and Skim's LLMClient.
    Returns the raw text response.
    """
    # Skim wrapper (pipeline.agent.llm_client.LLMClient)
    if hasattr(llm_client, "chat_with_tools"):
        response = llm_client.chat_with_tools(
            messages=[{"role": "user", "content": prompt}],
            tools=[],
        )
        content = response.get("content")
        if content:
            return content.strip()
        raise ValueError("Empty LLMClient response")

    # Gemini client (google.generativeai.GenerativeModel)
    if hasattr(llm_client, "generate_content"):
        response = llm_client.generate_content(prompt)
        text = getattr(response, "text", None)
        if text:
            return text.strip()
        raise ValueError("Empty Gemini response")

    # Groq client (groq.Groq)
    if hasattr(llm_client, "chat"):
        completion = llm_client.chat.completions.create(
            model=os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        return completion.choices[0].message.content.strip()

    raise TypeError(f"Unsupported LLM client type: {type(llm_client)}")


def _add_empty_bullets(stories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add empty bullet_points field so templates don't error."""
    return [{**s, "bullet_points": []} for s in stories]


# ── Card mode ─────────────────────────────────────────────────────────────────

def _prepare_card_stories(stories: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Card mode: no LLM call.
    Restructures existing fields so the template can render them as a card.
    Adds 'bullet_points': [] so the shared partial doesn't error.
    """
    return [{**s, "bullet_points": []} for s in stories]


# ── Public API ────────────────────────────────────────────────────────────────

def apply_summary_style(
    stories: list[dict[str, Any]],
    summary_style: str,
    llm_client: Any | None = None,
) -> list[dict[str, Any]]:
    """
    Apply the requested summary_style to a list of story dicts.

    Called once per subscriber at compose time, after article selection.

    Args:
        stories:       The filtered, ranked story list.
        summary_style: One of 'prose', 'bullet_points', 'card'.
        llm_client:    Optional LLM client (required for 'bullet_points').

    Returns:
        The story list with 'bullet_points' injected where applicable.
        For 'prose' and 'card', stories are returned with minimal modification.
    """
    if summary_style == "bullet_points":
        if llm_client is None:
            logger.warning(
                "[summary_style] bullet_points requested but no LLM client provided "
                "— falling back to prose"
            )
            return _add_empty_bullets(stories)
        return _call_llm_for_bullets(stories, llm_client)

    if summary_style == "card":
        return _prepare_card_stories(stories)

    # Default: prose — return stories unchanged (just ensure bullet_points field exists)
    return _add_empty_bullets(stories)
