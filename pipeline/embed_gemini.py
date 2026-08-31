"""
Embed articles using Gemini embedding API (768-dim) for hybrid RAG search.

Runs alongside the existing MiniLM embeddings. Articles get BOTH:
  - embedding (384-dim MiniLM, local) — used by pipeline search
  - embedding_gemini (768-dim Gemini) — used by dashboard hybrid search
"""

import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from pipeline.config import configure_logging
from pipeline.db import get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
GEMINI_EMBEDDING_DIM = 768
BATCH_SIZE = 20
RATE_LIMIT_DELAY = 0.5


def _get_gemini_key() -> str:
    keys = os.environ.get("GEMINI_API_KEYS", "").split(",")
    key = next((k.strip() for k in keys if k.strip()), None)
    if not key:
        key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("No Gemini API key configured for embeddings")
    return key


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=_get_gemini_key())
    return _client


def _vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(str(v) for v in embedding) + "]"


def embed_texts_gemini(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using Gemini embedding API."""
    if not texts:
        return []

    client = _get_client()
    results: list[list[float]] = []

    for text in texts:
        result = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                output_dimensionality=GEMINI_EMBEDDING_DIM,
            ),
        )
        values = result.embeddings[0].values
        if not values:
            raise RuntimeError(f"Empty Gemini embedding for: {text[:80]}")
        results.append(list(values))
        time.sleep(RATE_LIMIT_DELAY)

    return results


def embed_new_articles_gemini(limit: int = 100) -> int:
    """Embed articles that are missing Gemini embeddings."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, summary FROM articles
                WHERE embedding_gemini IS NULL
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return 0

    texts = [f"{title} {summary or ''}".strip() for _, title, summary in rows]

    for i in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[i : i + BATCH_SIZE]
        batch_rows = rows[i : i + BATCH_SIZE]

        try:
            embeddings = embed_texts_gemini(batch_texts)
        except Exception as e:
            logger.error("Gemini embedding batch failed at offset %d: %s", i, e)
            break

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                for (article_id, _, _), embedding in zip(batch_rows, embeddings):
                    cur.execute(
                        "UPDATE articles SET embedding_gemini = %s::vector WHERE id = %s",
                        (_vector_literal(embedding), article_id),
                    )
            conn.commit()
        finally:
            conn.close()

        logger.info("Gemini-embedded batch %d–%d", i, i + len(batch_texts) - 1)

    return len(rows)


def embed_all_articles_gemini(batch_size: int = 100) -> int:
    """Backfill all articles with Gemini embeddings."""
    total = 0
    while True:
        embedded = embed_new_articles_gemini(limit=batch_size)
        total += embedded
        if embedded == 0:
            break
    return total


def count_missing_gemini_embeddings() -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM articles WHERE embedding_gemini IS NULL"
            )
            return cur.fetchone()[0]
    finally:
        conn.close()


if __name__ == "__main__":
    configure_logging()
    missing_before = count_missing_gemini_embeddings()
    logger.info("Articles missing Gemini embeddings: %d", missing_before)
    embedded = embed_all_articles_gemini()
    missing_after = count_missing_gemini_embeddings()
    logger.info(
        "Gemini-embedded %d articles; %d still missing",
        embedded,
        missing_after,
    )
