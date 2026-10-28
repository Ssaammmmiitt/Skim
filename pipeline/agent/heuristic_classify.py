"""Heuristic article classification used when LLM providers are unavailable.

This is the second-quality fallback after Groq: keyword signals assign a topic and
importance so digest selection still sees a scored corpus instead of dropping stories.
"""

from __future__ import annotations

import re
from typing import Any

from pipeline.agent.tools import TOPIC_CATEGORIES

# Higher-weight phrases first within each topic.
_TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ai_ml": (
        "openai",
        "anthropic",
        "gemini",
        "llm",
        "gpt-",
        "chatgpt",
        "claude",
        "machine learning",
        "deep learning",
        "neural",
        "transformer",
        "embedding",
        "rag",
        "diffusion",
        "gpu",
        "nvidia",
        "model weights",
        "artificial intelligence",
        " ai ",
        "ml ",
    ),
    "cybersecurity": (
        "cve-",
        "ransomware",
        "malware",
        "phishing",
        "zero-day",
        "zero day",
        "vulnerability",
        "exploit",
        "breach",
        "hacker",
        "infosec",
        "cybersecurity",
        "security flaw",
    ),
    "cloud_infra": (
        "kubernetes",
        "aws ",
        "amazon web services",
        "google cloud",
        "azure",
        "cloudflare",
        "devops",
        "docker",
        "serverless",
        "datadog",
        "terraform",
        "infrastructure",
    ),
    "web_dev": (
        "javascript",
        "typescript",
        "react",
        "next.js",
        "nextjs",
        "frontend",
        "css",
        "browser",
        "webassembly",
        "nodejs",
        "node.js",
        "vue",
        "svelte",
    ),
    "programming": (
        "github",
        "open source",
        "compiler",
        "rust ",
        "golang",
        "python",
        "linux kernel",
        "programming language",
        "developer tool",
        "ide ",
        "vscode",
    ),
    "startups": (
        "startup",
        "series a",
        "series b",
        "venture",
        "funding round",
        "ipo",
        "acquisition",
        "raised $",
    ),
    "science": (
        "nasa",
        "physics",
        "quantum",
        "biology",
        "climate",
        "research paper",
        "arxiv",
        "scientists",
    ),
}

_HIGH_IMPACT = (
    "breaking",
    "major",
    "launch",
    "launches",
    "released",
    "open-sources",
    "open sources",
    "security flaw",
    "zero-day",
    "critical",
    "billion",
    "acquisition",
    "outage",
    "lawsuit",
    "banned",
    "leak",
)

_LOW_IMPACT = (
    "coupon",
    "promo code",
    "discount",
    "gift guide",
    "deal of",
    "how to record your screen",
    "best gifts",
    "sponsored",
)

_SOURCE_BONUS = {
    "techcrunch": 0.5,
    "arstechnica": 0.5,
    "theverge": 0.3,
    "mit_tech_review": 0.6,
    "wired": 0.2,
    "bleeping_computer": 0.6,
    "the_register": 0.4,
    "cloudflare_blog": 0.5,
    "github_blog": 0.4,
    "hugging_face": 0.5,
    "infoq": 0.4,
    "simon_willison": 0.5,
    "phoronix": 0.3,
}


def _normalize_text(*parts: str | None) -> str:
    return " " + " ".join(p or "" for p in parts).lower() + " "


def infer_topic(title: str, summary: str | None = None) -> str:
    text = _normalize_text(title, summary)
    best_topic = "other"
    best_hits = 0
    for topic, keywords in _TOPIC_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in text)
        if hits > best_hits:
            best_hits = hits
            best_topic = topic
    if best_topic not in TOPIC_CATEGORIES:
        return "other"
    return best_topic


def infer_importance(
    title: str,
    summary: str | None = None,
    source: str | None = None,
) -> float:
    text = _normalize_text(title, summary)
    score = 5.0

    high_hits = sum(1 for phrase in _HIGH_IMPACT if phrase in text)
    low_hits = sum(1 for phrase in _LOW_IMPACT if phrase in text)
    score += min(3.0, high_hits * 1.2)
    score -= min(3.0, low_hits * 1.5)
    score += _SOURCE_BONUS.get((source or "").lower(), 0.0)

    # Slight bump for longer substantive summaries.
    if summary and len(summary) > 280:
        score += 0.3

    # CVE identifiers are almost always high-signal for this digest.
    if re.search(r"\bcve-\d{4}-\d+\b", text):
        score = max(score, 7.5)

    return float(max(1.0, min(10.0, round(score, 1))))


def heuristic_classify_article(article: dict[str, Any]) -> dict[str, Any]:
    title = str(article.get("title") or "")
    summary = article.get("summary")
    summary_text = str(summary) if summary else None
    source = str(article.get("source") or "")
    topic = infer_topic(title, summary_text)
    importance = infer_importance(title, summary_text, source)
    return {
        "article_id": int(article["id"]),
        "topic": topic,
        "importance_score": importance,
        "reasoning": "heuristic fallback (LLM unavailable)",
        "provider": "heuristic",
    }


def heuristic_classify_batch(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [heuristic_classify_article(article) for article in articles]
