import os
import json
import logging
from pathlib import Path

from pipeline.config import configure_logging
from pipeline.ingest import _build_adapters
from pipeline.sources.extractor import enrich_articles

logger = logging.getLogger(__name__)

def test_local_extraction(limit_per_source: int = 2):
    """
    Fetches a small number of articles from each source, extracts their content,
    and saves them locally for inspection and testing.
    """
    output_dir = Path("pipeline/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    adapters = _build_adapters()
    all_articles = []

    # 1. Discover
    logger.info(f"Fetching up to {limit_per_source} articles per source for local testing...")
    for adapter in adapters:
        try:
            articles = adapter.fetch(limit=limit_per_source)
            all_articles.extend(articles)
            logger.info("%s: fetched %d articles", adapter.name, len(articles))
        except Exception as exc:
            logger.warning("%s FAILED: %s", adapter.name, exc)

    if not all_articles:
        logger.info("No articles fetched.")
        return

    # 2. Extract
    logger.info(f"Extracting content for {len(all_articles)} articles...")
    enrich_articles(all_articles)

    # 3. Save Locally & Track Stats
    logger.info(f"Saving extracted content to {output_dir.absolute()}")
    
    stats = {}
    
    for article in all_articles:
        source = article.source
        if source not in stats:
            stats[source] = {"fetched": 0, "extracted": 0, "failed": 0}
            
        stats[source]["fetched"] += 1
        
        # Create a safe filename from the title
        safe_title = "".join([c if c.isalnum() else "_" for c in article.title])[:50]
        source_dir = output_dir / source
        source_dir.mkdir(exist_ok=True)
        
        file_path = source_dir / f"{safe_title}.md"
        
        content = f"# {article.title}\n"
        content += f"**URL:** {article.url}\n"
        content += f"**Source:** {source}\n"
        content += f"**Published:** {article.published_at}\n\n"
        content += "---\n\n"
        
        if article.raw_text:
            content += article.raw_text
            stats[source]["extracted"] += 1
        else:
            content += "NO CONTENT EXTRACTED."
            stats[source]["failed"] += 1
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    # 4. Generate Summary Markdown
    summary_path = output_dir / "summary.md"
    summary_md = "# Local Extraction Summary\n\n"
    summary_md += "| Source | Fetched | Successfully Extracted | Failed Extraction | Success Rate |\n"
    summary_md += "|---|---|---|---|---|\n"
    
    total_fetched = 0
    total_extracted = 0
    
    for source, data in stats.items():
        fetched = data["fetched"]
        extracted = data["extracted"]
        failed = data["failed"]
        rate = (extracted / fetched * 100) if fetched > 0 else 0
        
        total_fetched += fetched
        total_extracted += extracted
        
        summary_md += f"| {source} | {fetched} | {extracted} | {failed} | {rate:.1f}% |\n"
        
    overall_rate = (total_extracted / total_fetched * 100) if total_fetched > 0 else 0
    summary_md += f"| **TOTAL** | **{total_fetched}** | **{total_extracted}** | **{total_fetched - total_extracted}** | **{overall_rate:.1f}%** |\n"
    
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(summary_md)

    logger.info(f"Local extraction testing complete! Summary written to {summary_path}")

if __name__ == "__main__":
    configure_logging()
    test_local_extraction(limit_per_source=10)
