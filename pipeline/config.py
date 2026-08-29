USER_AGENT = "Skim/1.0 (+https://github.com/Ssaammmmiitt/Skim)"

# Some feeds ship the whole article body in content:encoded. Cap it so summaries
# stay inside MiniLM's effective input window and don't bloat LLM prompts.
SUMMARY_MAX_CHARS = 1000

RSS_SOURCES = [
    {"url": "https://feeds.feedburner.com/TechCrunch", "name": "techcrunch"},
    {"url": "https://feeds.arstechnica.com/arstechnica/index", "name": "arstechnica"},
    {"url": "https://www.theverge.com/rss/index.xml", "name": "theverge"},
    {"url": "https://www.technologyreview.com/feed/", "name": "mit_tech_review"},
]
