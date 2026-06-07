from DB.db import feedback_collection
from datetime import datetime
from Src.Services.cache_service import cache_delete
from Src.Services.mode_detector import detect_user_mode
from Src.Services.prompt_service import normalize_mode


def store_feedback(query, answer, rating, source, mode=None):
    normalized_rating = str(rating).strip().lower()
    normalized_source = str(source).strip().lower()
    normalized_mode = normalize_mode(mode or detect_user_mode(query))

    feedback_collection.insert_one({
        "query": query,
        "answer": answer,
        "rating": normalized_rating,
        "source": normalized_source,
        "mode": normalized_mode,
        "timestamp": datetime.utcnow()
    })
    cache_delete(query)
