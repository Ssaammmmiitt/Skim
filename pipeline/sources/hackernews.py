from datetime import datetime, timezone

import requests

from pipeline.models import Article
from pipeline.resilience import retry_with_backoff
from pipeline.sources.base import SourceAdapter


class HackerNewsAdapter(SourceAdapter):
    name = "hackernews"
    BASE_URL = "https://hacker-news.firebaseio.com/v0"

    @retry_with_backoff(retryable_exceptions=(requests.RequestException,))
    def _get_json(self, url: str) -> object:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()

    def fetch(self, limit: int = 30) -> list[Article]:
        story_ids = self._get_json(f"{self.BASE_URL}/topstories.json")
        if not isinstance(story_ids, list):
            return []

        articles = []
        for sid in story_ids[:limit]:
            story = self._get_json(f"{self.BASE_URL}/item/{sid}.json")
            if isinstance(story, dict) and story.get("url"):
                articles.append(
                    Article(
                        title=story["title"],
                        url=self._normalize_url(story["url"]),
                        source="hackernews",
                        published_at=datetime.fromtimestamp(
                            story["time"], tz=timezone.utc
                        ),
                        summary=story.get("title", ""),
                    )
                )
        return articles
