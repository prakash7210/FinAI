from DB.db import feedback_collection


# -----------------------------
# SOURCE SCORE CALCULATION
# -----------------------------
def get_source_scores(query):

    records = list(feedback_collection.find({"query": query}))

    scores = {
        "llm": 0,
        "rag": 0,
        "search": 0
    }

    for r in records:
        source = str(r.get("source", "")).lower()
        rating = str(r.get("rating", "")).lower()

        if source not in scores:
            continue

        if rating == "good":
            scores[source] += 1
        elif rating == "bad":
            scores[source] -= 1

    return scores


# -----------------------------
# BEST SOURCE
# -----------------------------
def get_best_source(query):

    scores = get_source_scores(query)

    best_source = max(scores, key=scores.get)

    if scores[best_source] > 0:
        return best_source

    return None


# -----------------------------
# APPLY RLHF (MAIN LOGIC 🔥)
# -----------------------------
def apply_rlhf(query, current_source):

    best_source = get_best_source(query)

    if best_source and best_source != current_source:
        print(f"🔁 RLHF override: {current_source} → {best_source}")
        return best_source

    return current_source
