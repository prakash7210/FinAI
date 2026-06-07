import time
from Src.model.llm import generate_answer
from Src.RAG.rag import retrieve_docs
from Src.Services.search_service import search_external
from Src.Services.cache_service import cache_get, cache_set
from Src.Services.intent_service import classify_intent
from Src.Services.rag_filter import is_relevant
from Src.Services.rlhf_service import apply_rlhf
from Src.Services.query_service import store_query
from Src.Services.prompt_service import build_improved_prompt
from Src.Services.mode_detector import detect_user_mode


def generate_feedback_answer(query, context, mode):
    improved_query = build_improved_prompt(query, mode)
    return generate_answer(improved_query, context, mode)


# -----------------------------
# CONFIDENCE    
# -----------------------------
def compute_confidence(response: str):
    if not response:
        return 0.0

    score = 0.5

    if len(response) > 200:
        score += 0.3

    if "risk" in response.lower():
        score += 0.1

    if "recommendation" in response.lower():
        score += 0.1

    if "not sure" in response.lower():
        score -= 0.4

    return max(min(score, 1.0), 0.0)


# -----------------------------
# MAIN PIPELINE
# -----------------------------
def analyze(query: str):

    start_time = time.time()

    # -----------------------------
    # CACHE
    # -----------------------------
    cached = cache_get(query)
    if cached:
        return {
            "response": cached,
            "source": "cache",
            "confidence": 1.0,
            "latency": 0
        }

    mode = detect_user_mode(query)
    print(f"Mode: {mode}")

    # -----------------------------
    # STEP 1: INTENT DETECTION 🔥
    # -----------------------------
    intent = classify_intent(query)
    if mode == "realtime":
        intent = "realtime"

    print(f"Intent: {intent}")

    # -----------------------------
    # STEP 2: REALTIME → SEARCH
    # -----------------------------
    if intent == "realtime":
        print("🔍 Using Search API")

        context = search_external(query)
        final = generate_feedback_answer(query, context, mode)

        cache_set(query, final)

        return {
            "response": final,
            "source": "search",
            "confidence": 0.95,
            "mode": mode,
            "latency": round(time.time() - start_time, 2)
        }

    # -----------------------------
    # STEP 3: COMPANY → RAG
    # -----------------------------
    if intent == "rag":
        rag_context = retrieve_docs(query)

        if rag_context and is_relevant(query, rag_context):
            print("✅ Using RAG")

            final = generate_feedback_answer(query, rag_context, mode)

            cache_set(query, final)

            return {
                "response": final,
                "source": "rag",
                "confidence": 0.9,
                "mode": mode,
                "latency": round(time.time() - start_time, 2)
            }

    # -----------------------------
    # STEP 4: GENERAL → LLM
    # -----------------------------
    print("🧠 Using LLM")

    initial = generate_feedback_answer(query, "", mode)
    confidence = compute_confidence(initial)

    # fallback
    if confidence < 0.6:
        print("🔁 Low confidence → Search")

        context = search_external(query)
        final = generate_feedback_answer(query, context, mode)

        source = "search"
        confidence = 0.7
    else:
        final = initial
        source = "llm"

    # -----------------------------
    # APPLY RLHF SOURCE ADJUSTMENT
    # -----------------------------
    original_source = source
    source = apply_rlhf(query, source)


    # -----------------------------
    # RE-RUN ONLY IF RLHF CHANGED SOURCE
    # -----------------------------
    if source != original_source:
        if source == "rag":
            context = retrieve_docs(query)
        elif source == "search":
            context = search_external(query)
        else:
            context = ""

        final = generate_feedback_answer(query, context, mode)
        confidence = compute_confidence(final)


    # -----------------------------
    # CACHE
    # -----------------------------
    cache_set(query, final)

    # -----------------------------
    # STORE QUERY
    # -----------------------------
    store_query(query, final, source, round(time.time() - start_time, 2))

    return {
        "response": final,
        "source": source,
        "confidence": confidence,
        "mode": mode,
        "latency": round(time.time() - start_time, 2)
    }
