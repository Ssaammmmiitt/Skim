from abc import ABC, abstractmethod
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pipeline.models import Article


def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    clean_params = {
        k: v
        for k, v in params.items()
        if not k.startswith("utm_") and k not in ["ref", "source"]
    }
    host = parsed.netloc.lower().removeprefix("www.")
    return urlunparse(
        (
            parsed.scheme,
            host,
            parsed.path,
            parsed.params,
            urlencode(clean_params, doseq=True),
            "",
        )
    )


class SourceAdapter(ABC):
    name: str  # "hackernews", "techcrunch", etc.

    @abstractmethod
    def fetch(self, limit: int = 30) -> list[Article]:
        """Fetch articles from this source. Returns normalized Articles."""
        pass

    def _normalize_url(self, url: str) -> str:
        return normalize_url(url)
