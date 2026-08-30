"""Function-calling tool schemas for the agent reasoning pipeline."""

TOPIC_CATEGORIES = [
    "ai_ml",
    "web_dev",
    "cloud_infra",
    "cybersecurity",
    "startups",
    "programming",
    "science",
    "other",
]

CLASSIFY_ARTICLE = {
    "type": "function",
    "function": {
        "name": "classify_article",
        "description": (
            "Classify a news article by topic category and assign an importance "
            "score from 1-10"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "article_id": {
                    "type": "integer",
                    "description": "The article's database ID",
                },
                "topic": {
                    "type": "string",
                    "enum": TOPIC_CATEGORIES,
                    "description": "Primary topic category",
                },
                "importance_score": {
                    "type": "number",
                    "description": (
                        "1=routine/minor, 5=notable, 8=significant, 10=groundbreaking"
                    ),
                },
                "reasoning": {
                    "type": "string",
                    "description": "One sentence explaining why this score",
                },
            },
            "required": ["article_id", "topic", "importance_score", "reasoning"],
        },
    },
}

GENERATE_INSIGHT = {
    "type": "function",
    "function": {
        "name": "generate_insight",
        "description": (
            "Generate a 2-3 sentence editorial insight explaining why this article "
            "matters to a working engineer"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "article_id": {"type": "integer"},
                "insight": {
                    "type": "string",
                    "description": "2-3 sentences on why this matters",
                },
                "key_takeaway": {
                    "type": "string",
                    "description": "One-line takeaway",
                },
            },
            "required": ["article_id", "insight", "key_takeaway"],
        },
    },
}

SELECT_TOP_STORIES = {
    "type": "function",
    "function": {
        "name": "select_top_stories",
        "description": (
            "From all classified articles today, select and order the most important "
            "ones for the daily digest"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "selected_article_ids": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "Ordered list of article IDs, most important first",
                },
                "rationale": {
                    "type": "string",
                    "description": "Brief explanation of selection and ordering logic",
                },
            },
            "required": ["selected_article_ids", "rationale"],
        },
    },
}

ALL_TOOLS = [CLASSIFY_ARTICLE, GENERATE_INSIGHT, SELECT_TOP_STORIES]

PASS_TOOLS = {
    "classify": [CLASSIFY_ARTICLE],
    "insight": [GENERATE_INSIGHT],
    "select": [SELECT_TOP_STORIES],
}
