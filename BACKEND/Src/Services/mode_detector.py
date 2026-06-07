from Src.model.llm import generate_answer


# -----------------------------
# LLM DETECTOR (SAFE VERSION)
# -----------------------------
def detect_user_mode_llm(query: str) -> str:

    prompt = f"""
You are an expert classifier.

Classify the user's financial knowledge level.

Categories:
- beginner
- intermediate
- expert

Rules:
- Output ONLY one word
- No explanation

Query: {query}
"""

    try:
        response = generate_answer(prompt, "").strip().lower()

        if "expert" in response:
            return "expert"
        elif "intermediate" in response:
            return "intermediate"
        elif "beginner" in response:
            return "beginner"

        return "beginner"

    except Exception as e:
        print("Mode detection error:", e)
        return "beginner"


# -----------------------------
# MAIN HYBRID DETECTOR 🔥
# -----------------------------
def detect_user_mode(query: str) -> str:

    q = query.lower().strip()

    # -----------------------------
    # STEP 1: CASUAL (VERY IMPORTANT 🔥)
    # -----------------------------
    casual_words = [
        "hi", "hello", "hey", "thanks", "ok", "yes",
        "no", "how are you"
    ]

    if len(q.split()) <= 2 or any(w in q for w in casual_words):
        return "casual"

    # -----------------------------
    # STEP 2: REALTIME (SHORTCUT)
    # -----------------------------
    realtime_words = [
        "price", "today", "now", "live", "current",
        "stock price", "market today"
    ]

    if any(w in q for w in realtime_words):
        return "realtime"

    # -----------------------------
    # STEP 3: EXPERT RULES ⚡
    # -----------------------------
    expert_words = [
        "dcf", "valuation", "ebitda", "free cash flow",
        "discounted cash flow", "alpha", "beta",
        "derivatives", "options", "futures",
        "monte carlo", "npv", "irr"
    ]

    if any(w in q for w in expert_words):
        return "expert"

    # -----------------------------
    # STEP 4: INTERMEDIATE RULES ⚡
    # -----------------------------
    intermediate_words = [
        "revenue", "profit", "growth", "financial",
        "earnings", "balance sheet", "analysis",
        "company performance", "quarter results"
    ]

    if any(w in q for w in intermediate_words):
        return "intermediate"

    # -----------------------------
    # STEP 5: VERY SIMPLE → BEGINNER
    # -----------------------------
    if len(q.split()) <= 5:
        return "beginner"

    # -----------------------------
    # STEP 6: LLM FALLBACK 🔥
    # -----------------------------
    return detect_user_mode_llm(query)