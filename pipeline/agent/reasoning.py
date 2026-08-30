import logging
import time
from typing import Any, Iterator

from pipeline.agent.llm_client import LLMClient
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
DEFAULT_BATCH_DELAY_SECONDS = 2
IMPORTANCE_THRESHOLD_FOR_INSIGHTS = 5
DEFAULT_DIGEST_SIZE = 8
MIN_DIGEST_STORIES = 7
MAX_DIGEST_STORIES = 10


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
            batch_results = self._classify_single_batch(batch)
            classified.extend(batch_results)
            classified_ids.update(result["article_id"] for result in batch_results)

            if batch_index < len(batches) - 1 and self.batch_delay_seconds:
                time.sleep(self.batch_delay_seconds)

        missing = [article for article in articles if article["id"] not in classified_ids]
        for index, article in enumerate(missing):
            retry_results = self._classify_single_batch([article])
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
            args = self._validate_classification(tool_call["arguments"], batch_ids)
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

    def generate_insights(self, articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not articles:
            return []

        insights: list[dict[str, Any]] = []
        for index, article in enumerate(articles):
            response = self.llm.chat_with_tools(
                messages=build_insight_messages([article]),
                tools=[GENERATE_INSIGHT],
                tool_choice={
                    "type": "function",
                    "function": {"name": "generate_insight"},
                },
            )
            if not response["tool_calls"]:
                logger.warning("No insight generated for article %s", article["id"])
                continue

            args = self._validate_insight(response["tool_calls"][0]["arguments"], article)
            update_article_insight(
                article_id=args["article_id"],
                insight=args["insight"],
                key_takeaway=args["key_takeaway"],
            )
            insights.append(args)

            if index < len(articles) - 1 and self.batch_delay_seconds:
                time.sleep(self.batch_delay_seconds)

        return insights

    def generate_insights_for_top_articles(
        self,
        min_score: float = IMPORTANCE_THRESHOLD_FOR_INSIGHTS,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        articles = get_articles_needing_insights(min_score=min_score, limit=limit)
        return self.generate_insights(articles)

    def _validate_insight(
        self, arguments: dict[str, Any], article: dict[str, Any]
    ) -> dict[str, Any]:
        article_id = int(arguments["article_id"])
        if article_id != article["id"]:
            raise ValueError(f"Unexpected article_id {article_id}")

        insight = str(arguments["insight"]).strip()
        key_takeaway = str(arguments["key_takeaway"]).strip()
        if not insight or not key_takeaway:
            raise ValueError("insight and key_takeaway must be non-empty")

        return {
            "article_id": article_id,
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
        return {"articles": [], "selected_article_ids": [], "rationale": ""}

    logger.info("Pass 3: selecting digest from %d classified articles", len(all_classified))
    return agent.select_digest_stories(all_classified, n=n)


if __name__ == "__main__":
    import logging as _logging

    from pipeline.db import get_unclassified_articles

    _logging.basicConfig(
        level=_logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    unclassified = get_unclassified_articles(limit=200)
    selection = run_agent_reasoning(unclassified)
    logger.info(
        "Agent reasoning complete: selected %d stories",
        len(selection["articles"]),
    )
    if selection["rationale"]:
        logger.info("Selection rationale: %s", selection["rationale"])
    if not selection["articles"]:
        raise SystemExit(1)
