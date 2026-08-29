from datetime import datetime, timezone

import requests

from pipeline.models import Article
from pipeline.sources.base import SourceAdapter


class HackerNewsAdapter(SourceAdapter):
    name = "hackernews"
    BASE_URL = "https://hacker-news.firebaseio.com/v0"

    def fetch(self, limit: int = 30) -> list[Article]:
        response = requests.get(f"{self.BASE_URL}/topstories.json", timeout=30)
        response.raise_for_status()
        story_ids = response.json()[:limit]

        articles = []
        for sid in story_ids:
            item_response = requests.get(f"{self.BASE_URL}/item/{sid}.json", timeout=30)
            item_response.raise_for_status()
            story = item_response.json()
            if story and story.get("url"):
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
