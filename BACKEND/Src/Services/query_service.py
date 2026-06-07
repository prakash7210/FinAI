from DB.db import queries_collection
from datetime import datetime


def store_query(query, response, source, latency):

    queries_collection.insert_one({
        "query": query,
        "response": response,
        "source": source,
        "latency": latency,
        "timestamp": datetime.utcnow()
    })