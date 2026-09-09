import logging
from pipeline.config import configure_logging
from pipeline.db import get_connection

logger = logging.getLogger(__name__)

def cleanup_spam():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM articles
                WHERE source = 'dev_to'
                  AND importance_score <= 1
                  AND digest_date IS NULL
                RETURNING id;
            """)
            deleted = cur.fetchall()
            logger.info("Deleted %d spam articles from dev_to (importance_score <= 1)", len(deleted))
            
            # Also clean up recently ingested dev_to articles that haven't been classified yet, 
            # to prevent them from wasting Groq tokens. We'll re-fetch valid ones later.
            cur.execute("""
                DELETE FROM articles
                WHERE source = 'dev_to'
                  AND importance_score IS NULL
                  AND digest_date IS NULL;
            """)
            deleted_unclassified = cur.rowcount
            logger.info("Deleted %d unclassified dev_to articles (will be re-fetched cleanly if valid)", deleted_unclassified)
        
        conn.commit()
    except Exception as e:
        logger.error("Cleanup failed: %s", e)
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    configure_logging()
    cleanup_spam()
