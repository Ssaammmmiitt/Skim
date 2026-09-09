import requests
from datetime import datetime
from dateutil import parser as date_parser

from pipeline.models import Article
from pipeline.resilience import retry_with_backoff
from pipeline.sources.base import SourceAdapter

class LobstersAdapter(SourceAdapter):
    name = "lobsters"
    BASE_URL = "https://lobste.rs/hottest.json"

    @retry_with_backoff(retryable_exceptions=(requests.RequestException,))
    def _get_json(self, url: str) -> list:
        headers = {"User-Agent": "SkimBot"}
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def fetch(self, limit: int = 30) -> list[Article]:
        articles_data = self._get_json(self.BASE_URL)
        
        if not isinstance(articles_data, list):
            return []

        articles = []
        for item in articles_data[:limit]:
            if not isinstance(item, dict) or not item.get("url"):
                continue
                
            published_at = None
            if item.get("created_at"):
                try:
                    published_at = date_parser.parse(item["created_at"])
                except Exception:
                    pass

            articles.append(
                Article(
                    title=item.get("title", "Untitled"),
                    url=self._normalize_url(item["url"]),
                    source=self.name,
                    published_at=published_at,
                    summary=item.get("description", "")
                )
            )
            
        return articles
