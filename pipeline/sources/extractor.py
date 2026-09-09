import asyncio
import logging
from bs4 import BeautifulSoup
import httpx
import trafilatura

from pipeline.models import Article

logger = logging.getLogger(__name__)

def _extract_trafilatura(html: str) -> str | None:
    return trafilatura.extract(html, include_links=True, include_images=False)

def _extract_bs4(html: str) -> str | None:
    soup = BeautifulSoup(html, 'html.parser')
    paragraphs = soup.find_all('p')
    text = "\n".join([p.get_text() for p in paragraphs]).strip()
    return text if text else None

def _extract_og(html: str) -> str | None:
    soup = BeautifulSoup(html, 'html.parser')
    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        return og_desc["content"].strip()
    return None

async def _fetch_and_extract_single(client: httpx.AsyncClient, article: Article) -> None:
    if article.raw_text:
        return # Already extracted

    # Base raw text from feed summary if available
    base_snippet = article.summary or ""

    try:
        response = await client.get(article.url, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
        html = response.text
        
        # 1. Trafilatura
        text = _extract_trafilatura(html)
        if text and len(text) > 100:
            article.raw_text = text
            return
            
        # 2. BeautifulSoup Fallback
        text = _extract_bs4(html)
        if text and len(text) > 100:
            article.raw_text = text
            return
            
        # 3. OpenGraph Fallback
        text = _extract_og(html)
        if text:
            article.raw_text = text
            return
            
        # 4. Raw Snippet Baseline
        article.raw_text = base_snippet
        
    except httpx.HTTPError as e:
        logger.warning(f"HTTP error fetching {article.url}: {e}")
        article.raw_text = base_snippet
    except Exception as e:
        logger.warning(f"Error extracting {article.url}: {e}")
        article.raw_text = base_snippet

async def _extract_all(articles: list[Article]) -> None:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    }
    
    limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)
    async with httpx.AsyncClient(headers=headers, limits=limits) as client:
        tasks = [_fetch_and_extract_single(client, article) for article in articles]
        await asyncio.gather(*tasks)

def enrich_articles(articles: list[Article]) -> None:
    """Enrich a list of Article objects with raw_text concurrently."""
    if not articles:
        return
    logger.info(f"Enriching {len(articles)} articles with full content...")
    asyncio.run(_extract_all(articles))
    logger.info(f"Enrichment complete for {len(articles)} articles.")
