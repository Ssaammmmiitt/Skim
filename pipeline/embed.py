import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from pipeline.db import get_connection

load_dotenv(Path(__file__).resolve().parent / ".env")

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        if not os.environ.get("HF_TOKEN"):
            logger.warning(
                "HF_TOKEN not set; Hugging Face downloads may be slower or rate-limited. "
                "Create a free token at https://huggingface.co/settings/tokens"
            )
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    model = get_model()
    embeddings = model.encode(
        texts, normalize_embeddings=True, show_progress_bar=False
    )
    return embeddings.tolist()


def _vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(str(value) for value in embedding) + "]"


def embed_new_articles(limit: int = 100) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, summary FROM articles
                WHERE embedding IS NULL
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
    embeddings = embed_texts(texts)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            for (article_id, _, _), embedding in zip(rows, embeddings):
                cur.execute(
                    "UPDATE articles SET embedding = %s::vector WHERE id = %s",
                    (_vector_literal(embedding), article_id),
                )
        conn.commit()
    finally:
        conn.close()

    return len(rows)


def embed_all_articles(batch_size: int = 100) -> int:
    total = 0
    while True:
        embedded = embed_new_articles(limit=batch_size)
        total += embedded
        if embedded == 0:
            break
    return total


def count_missing_embeddings() -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM articles WHERE embedding IS NULL")
            return cur.fetchone()[0]
    finally:
        conn.close()


def search_similar(
    query: str, k: int = 5, min_similarity: float = 0.3
) -> list[dict]:
    query_embedding = _vector_literal(embed_texts([query])[0])

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, summary, insight,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM articles
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (query_embedding, query_embedding, k),
            )
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()

    return [
        result
        for result in results
        if float(result["similarity"]) >= min_similarity
    ]


def search_similar_articles_rpc(
    query: str, match_count: int = 5, match_threshold: float = 0.5
) -> list[dict]:
    query_embedding = _vector_literal(embed_texts([query])[0])

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, url, source, summary, insight, published_at, similarity
                FROM search_similar_articles(%s::vector, %s, %s)
                """,
                (query_embedding, match_count, match_threshold),
            )
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]
    finally:
        conn.close()


if __name__ == "__main__":
    import logging

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    embedded = embed_all_articles()
    missing = count_missing_embeddings()
    logging.info("Embedded %d articles; %d still missing embeddings", embedded, missing)
    if missing:
        raise SystemExit(1)
