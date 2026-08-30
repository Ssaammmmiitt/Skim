import logging
import os

USER_AGENT = "Skim/1.0 (+https://github.com/Ssaammmmiitt/Skim)"

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Some feeds ship the whole article body in content:encoded. Cap it so summaries
# stay inside MiniLM's effective input window and don't bloat LLM prompts.
SUMMARY_MAX_CHARS = 1000

RSS_SOURCES = [
    {"url": "https://feeds.feedburner.com/TechCrunch", "name": "techcrunch"},
    {"url": "https://feeds.arstechnica.com/arstechnica/index", "name": "arstechnica"},
    {"url": "https://www.theverge.com/rss/index.xml", "name": "theverge"},
    {"url": "https://www.technologyreview.com/feed/", "name": "mit_tech_review"},
]


def configure_logging(level: str | int | None = None) -> None:
    """Configure root logging once for CLI entry points and CI runs."""
    if level is None:
        level = os.environ.get("LOG_LEVEL", "INFO")
    if isinstance(level, str):
        level = getattr(logging, level.upper(), logging.INFO)

    root = logging.getLogger()
    formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)

    if root.handlers:
        root.setLevel(level)
        for handler in root.handlers:
            handler.setLevel(level)
            handler.setFormatter(formatter)
        return

    logging.basicConfig(level=level, format=LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
