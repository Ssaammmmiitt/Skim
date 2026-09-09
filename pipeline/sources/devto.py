import os
from datetime import datetime
import requests
from dateutil import parser as date_parser

from pipeline.models import Article
from pipeline.resilience import retry_with_backoff
from pipeline.sources.base import SourceAdapter

class DevToAdapter(SourceAdapter):
    name = "dev_to"
    BASE_URL = "https://dev.to/api/articles"

    @retry_with_backoff(retryable_exceptions=(requests.RequestException,))
    def _get_json(self, url: str, params: dict = None) -> list:
        headers = {"User-Agent": "SkimBot"}
        api_key = os.environ.get("DEVTO_API_KEY")
        if api_key:
            headers["api-key"] = api_key
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        return response.json()

    def fetch(self, limit: int = 30) -> list[Article]:
        params = {"per_page": limit, "state": "fresh", "language": "en"}
        articles_data = self._get_json(self.BASE_URL, params=params)
        
        if not isinstance(articles_data, list):
            return []

        articles = []
        for item in articles_data:
            if not isinstance(item, dict) or not item.get("url"):
                continue
                
            # Filter out spam articles with 0 engagement
            if item.get("public_reactions_count", 0) < 1:
                continue
                
            published_at = None
            if item.get("published_at"):
                try:
                    published_at = date_parser.parse(item["published_at"])
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
