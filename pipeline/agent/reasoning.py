import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Iterator

from pipeline.agent.llm_client import LLMClient, LLMProviderError
from pipeline.agent.prompts import (
    build_classification_messages,
    build_insight_messages,
    build_selection_messages,
)
from pipeline.agent.tools import CLASSIFY_ARTICLE, GENERATE_INSIGHT, SELECT_TOP_STORIES, TOPIC_CATEGORIES
from pipeline.db import (
    get_articles_needing_insights,
    get_todays_classified_articles,
    get_unclassified_articles,
    update_article_classification,
    update_article_insight,
)

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE = 5
DEFAULT_BATCH_DELAY_SECONDS = 1
IMPORTANCE_THRESHOLD_FOR_INSIGHTS = 5
DEFAULT_DIGEST_SIZE = 8
MIN_DIGEST_STORIES = 7
MAX_DIGEST_STORIES = 10

# Gemini free tier: 20 requests/day per project. With 5 keys that's 100 Gemini
# calls + unlimited Groq fallback.  Budget: ~50 classify (10 batches of 5)
# + ~12 insight + 1 select ≈ 63 calls, leaving headroom for retries.
DEFAULT_CLASSIFY_LIMIT = 50
DEFAULT_INSIGHT_LIMIT = 12

# Parallel insight workers — bounded to avoid hitting RPM limits.
# With 5 Gemini keys, 3 workers gives good throughput without burning keys.
INSIGHT_CONCURRENCY = 3


def chunked(items: list[Any], size: int) -> Iterator[list[Any]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


class ArticleAgent:
    def __init__(
        self,
        llm: LLMClient | None = None,
        batch_size: int = DEFAULT_BATCH_SIZE,
        batch_delay_seconds: float = DEFAULT_BATCH_DELAY_SECONDS,
    ):
        self.llm = llm or LLMClient()
        self.batch_size = batch_size
        self.batch_delay_seconds = batch_delay_seconds

    def classify_batch(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not articles:
            return []

        classified: list[dict[str, Any]] = []
        classified_ids: set[int] = set()
        batches = list(chunked(articles, self.batch_size))

        for batch_index, batch in enumerate(batches):
            try:
                batch_results = self._classify_single_batch(batch)
            except LLMProviderError as exc:
                logger.warning(
                    "Classification stopped after %d/%d articles: %s",
                    len(classified),
                    len(articles),
                    exc,
                )
                return classified

            classified.extend(batch_results)
            classified_ids.update(result["article_id"] for result in batch_results)

            if batch_index < len(batches) - 1 and self.batch_delay_seconds:
                time.sleep(self.batch_delay_seconds)

        missing = [article for article in articles if article["id"] not in classified_ids]
        for index, article in enumerate(missing):
            try:
                retry_results = self._classify_single_batch([article])
            except LLMProviderError as exc:
                logger.warning("Retry pass stopped: %s", exc)
                return classified

            classified.extend(retry_results)
            classified_ids.update(result["article_id"] for result in retry_results)

            if index < len(missing) - 1 and self.batch_delay_seconds:
                time.sleep(self.batch_delay_seconds)

        return classified

    def _classify_single_batch(
        self, batch: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        response = self.llm.chat_with_tools(
            messages=build_classification_messages(batch),
            tools=[CLASSIFY_ARTICLE],
            tool_choice={
                "type": "function",
                "function": {"name": "classify_article"},
            },
        )

        batch_ids = {article["id"] for article in batch}
        batch_results = []
        for tool_call in response["tool_calls"]:
            try:
                args = self._validate_classification(tool_call["arguments"], batch_ids)
            except (ValueError, KeyError, TypeError) as exc:
                logger.warning("Skipping invalid classification result: %s", exc)
                continue
            update_article_classification(
                article_id=args["article_id"],
                topic=args["topic"],
                importance_score=args["importance_score"],
            )
            batch_results.append(args)

        if len(batch_results) < len(batch):
            logger.warning(
                "Classified %d/%d articles in batch",
                len(batch_results),
                len(batch),
            )

        return batch_results

    def classify_unclassified_articles(self, limit: int = 100) -> list[dict[str, Any]]:
        articles = get_unclassified_articles(limit=limit)
        return self.classify_batch(articles)

    def _validate_classification(
        self, arguments: dict[str, Any], batch_ids: set[int]
    ) -> dict[str, Any]:
        article_id = int(arguments["article_id"])
        if article_id not in batch_ids:
            raise ValueError(f"Unexpected article_id {article_id} not in batch")

        topic = arguments["topic"]
        if topic not in TOPIC_CATEGORIES:
            raise ValueError(f"Invalid topic: {topic}")

        importance_score = float(arguments["importance_score"])
        if not 1 <= importance_score <= 10:
            raise ValueError(f"importance_score out of range: {importance_score}")

        return {
            "article_id": article_id,
            "topic": topic,
            "importance_score": importance_score,
            "reasoning": arguments.get("reasoning", ""),
        }

    def _generate_single_insight(
        self, article: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Generate insight for one article. Returns validated args or None.

        Thread-safe: each call goes through ``LLMClient.chat_with_tools`` which
        uses the shared key pool for Gemini and a lock-protected Groq fallback.
        """
        article_id = article["id"]
        try:
            response = self.llm.chat_with_tools(
                messages=build_insight_messages([article]),
                tools=[GENERATE_INSIGHT],
                tool_choice={
                    "type": "function",
                    "function": {"name": "generate_insight"},
                },
            )
        except LLMProviderError as exc:
            logger.warning(
                "Insight generation failed for article %s: %s",
                article_id,
                exc,
            )
            return None
        except Exception as exc:
            logger.error(
                "Unexpected error calling LLM for article %s: %s",
                article_id,
                exc,
                exc_info=True,
            )
            return None

        if not response["tool_calls"]:
            logger.warning("No insight generated for article %s", article_id)
            return None

        try:
            args = self._validate_insight(response["tool_calls"][0]["arguments"], article)
        except (ValueError, KeyError, TypeError) as exc:
            logger.warning("Skipping invalid insight for article %s: %s", article_id, exc)
            return None

        update_article_insight(
            article_id=args["article_id"],
            insight=args["insight"],
            key_takeaway=args["key_takeaway"],
        )
        logger.debug(
            "Insight generated for article %s via %s",
            article_id,
            response.get("provider", "unknown"),
        )
        return args

    def generate_insights(
        self,
        articles: list[dict[str, Any]],
        concurrency: int = INSIGHT_CONCURRENCY,
    ) -> list[dict[str, Any]]:
        if not articles:
            return []

        if concurrency <= 1:
            return self._generate_insights_sequential(articles)

        workers = min(concurrency, len(articles))
        logger.info(
            "Generating insights for %d articles with %d parallel workers",
            len(articles),
            workers,
        )

        results: dict[int, dict[str, Any]] = {}
        with ThreadPoolExecutor(max_workers=workers) as pool:
            future_to_article = {
                pool.submit(self._generate_single_insight, article): article
                for article in articles
            }
            for future in as_completed(future_to_article):
                article = future_to_article[future]
                try:
                    result = future.result()
                except Exception as exc:
                    logger.warning(
                        "Unexpected error generating insight for article %s: %s",
                        article["id"],
                        exc,
                    )
                    continue
                if result is not None:
                    results[article["id"]] = result

        ordered = [results[a["id"]] for a in articles if a["id"] in results]
        failed_count = len(articles) - len(ordered)
        if failed_count == 0:
            logger.info("Insights complete: all %d articles succeeded", len(articles))
        elif len(ordered) > 0:
            logger.warning(
                "Insights complete: %d/%d succeeded, %d failed",
                len(ordered),
                len(articles),
                failed_count,
            )
        else:
            logger.error(
                "Insights complete: ALL %d articles failed — check API keys and provider health",
                len(articles),
            )
        return ordered

    def _generate_insights_sequential(
        self, articles: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Fallback sequential path (used when concurrency=1 or in tests)."""
        insights: list[dict[str, Any]] = []
        for index, article in enumerate(articles):
            result = self._generate_single_insight(article)
            if result is not None:
                insights.append(result)
            if index < len(articles) - 1 and self.batch_delay_seconds:
                time.sleep(self.batch_delay_seconds)
        return insights

    def generate_insights_for_top_articles(
        self,
        min_score: float = IMPORTANCE_THRESHOLD_FOR_INSIGHTS,
        limit: int = DEFAULT_INSIGHT_LIMIT,
    ) -> list[dict[str, Any]]:
        articles = get_articles_needing_insights(min_score=min_score, limit=limit)
        return self.generate_insights(articles)

    def _validate_insight(
        self, arguments: dict[str, Any], article: dict[str, Any]
    ) -> dict[str, Any]:
        returned_id = int(arguments.get("article_id", 0))
        expected_id = article["id"]
        if returned_id != expected_id:
            logger.warning(
                "LLM returned article_id %d, expected %d — using expected",
                returned_id,
                expected_id,
            )

        insight = str(arguments.get("insight", "")).strip()
        key_takeaway = str(arguments.get("key_takeaway", "")).strip()
        if not insight or not key_takeaway:
            raise ValueError("insight and key_takeaway must be non-empty")

        return {
            "article_id": expected_id,
            "insight": insight,
            "key_takeaway": key_takeaway,
        }

    def select_digest_stories(
        self,
        all_classified: list[dict[str, Any]],
        n: int = DEFAULT_DIGEST_SIZE,
    ) -> dict[str, Any]:
        if not all_classified:
            return {"articles": [], "selected_article_ids": [], "rationale": ""}

        target_count = min(max(1, n), len(all_classified))
        messages = build_selection_messages(all_classified)
        messages[-1]["content"] = (
            f"Select the top {target_count} stories for today's digest.\n\n"
            f"{messages[-1]['content']}"
        )

        response = self.llm.chat_with_tools(
            messages=messages,
            tools=[SELECT_TOP_STORIES],
            tool_choice={
                "type": "function",
                "function": {"name": "select_top_stories"},
            },
        )
        if not response["tool_calls"]:
            raise ValueError("No story selection returned from LLM")

        selection = self._validate_selection(
            response["tool_calls"][0]["arguments"],
            all_classified,
            target_count=target_count,
        )
        article_by_id = {article["id"]: article for article in all_classified}
        ordered_articles = [
            article_by_id[article_id] for article_id in selection["selected_article_ids"]
        ]

        return {
            "articles": ordered_articles,
            "selected_article_ids": selection["selected_article_ids"],
            "rationale": selection["rationale"],
        }

    def select_todays_digest_stories(
        self, n: int = DEFAULT_DIGEST_SIZE
    ) -> dict[str, Any]:
        articles = get_todays_classified_articles()
        return self.select_digest_stories(articles, n=n)

    def _validate_selection(
        self,
        arguments: dict[str, Any],
        all_classified: list[dict[str, Any]],
        target_count: int,
    ) -> dict[str, Any]:
        valid_ids = {article["id"] for article in all_classified}
        selected_ids = [int(article_id) for article_id in arguments["selected_article_ids"]]

        if not selected_ids:
            raise ValueError("selected_article_ids must not be empty")
        if len(set(selected_ids)) != len(selected_ids):
            raise ValueError("selected_article_ids must be unique")

        min_count = min(MIN_DIGEST_STORIES, len(all_classified))
        max_count = min(MAX_DIGEST_STORIES, len(all_classified))
        if not min_count <= len(selected_ids) <= max_count:
            raise ValueError(
                f"expected {min_count}-{max_count} stories, got {len(selected_ids)}"
            )

        unknown_ids = [article_id for article_id in selected_ids if article_id not in valid_ids]
        if unknown_ids:
            raise ValueError(f"Unknown article IDs in selection: {unknown_ids}")

        rationale = str(arguments.get("rationale", "")).strip()
        if not rationale:
            raise ValueError("rationale must be non-empty")

        if len(selected_ids) > target_count:
            selected_ids = selected_ids[:target_count]

        return {
            "selected_article_ids": selected_ids,
            "rationale": rationale,
        }


def run_agent_reasoning(
    new_articles: list[dict[str, Any]],
    n: int = DEFAULT_DIGEST_SIZE,
    agent: ArticleAgent | None = None,
) -> dict[str, Any]:
    agent = agent or ArticleAgent()

    if new_articles:
        logger.info("Pass 1: classifying %d articles", len(new_articles))
        agent.classify_batch(new_articles)
    else:
        logger.info("Pass 1: no new articles to classify")

    logger.info("Pass 2: generating insights for top articles")
    agent.generate_insights_for_top_articles(min_score=IMPORTANCE_THRESHOLD_FOR_INSIGHTS)

    all_classified = get_todays_classified_articles()
    if not all_classified:
        agent.llm.log_usage_summary()
        return {"articles": [], "selected_article_ids": [], "rationale": ""}

    logger.info("Pass 3: selecting digest from %d classified articles", len(all_classified))
    try:
        result = agent.select_digest_stories(all_classified, n=n)
    except LLMProviderError as exc:
        logger.warning("Digest selection unavailable: %s", exc)
        result = {"articles": [], "selected_article_ids": [], "rationale": ""}

    agent.llm.log_usage_summary()
    return result


if __name__ == "__main__":
    import logging as _logging

    from pipeline.config import configure_logging
    from pipeline.db import get_unclassified_articles

    configure_logging()

    unclassified = get_unclassified_articles(limit=DEFAULT_CLASSIFY_LIMIT)
    selection = run_agent_reasoning(unclassified)
    logger.info(
        "Agent reasoning complete: selected %d stories",
        len(selection["articles"]),
    )
    if selection["rationale"]:
        logger.info("Selection rationale: %s", selection["rationale"])
