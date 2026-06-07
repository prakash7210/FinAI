from DB.db import feedback_collection


MODE_RULES = {
    "casual": """
    Quality: friendly, natural, and direct.
    Quantity: 1-2 short lines only.
    Avoid: financial analysis, long explanations, headings.
    """,
    "beginner": """
    Quality: simple words, no jargon, explain terms briefly.
    Quantity: short answer with 3-5 clear bullet points.
    Include: practical takeaway and risk note when financial.
    """,
    "intermediate": """
    Quality: balanced financial explanation with useful context.
    Quantity: medium answer with 5-7 bullets or short sections.
    Include: drivers, risks, opportunities, and practical takeaway.
    """,
    "expert": """
    Quality: analytical, precise, and decision-focused.
    Quantity: detailed but concise answer with structured sections.
    Include: assumptions, valuation/business drivers, risk scenarios, and confidence.
    """,
    "realtime": """
    Quality: focus on current-market style answer and be clear when live data is unavailable.
    Quantity: concise answer with key numbers/context first, then risks and takeaway.
    Include: source/context limits when exact live data is not available.
    """,
}


def normalize_mode(mode):
    mode = str(mode or "beginner").strip().lower()
    return mode if mode in MODE_RULES else "beginner"


def get_feedback_examples(rating, mode=None, limit=5):
    query = {"rating": rating}
    normalized_mode = normalize_mode(mode) if mode else None

    if normalized_mode:
        query["mode"] = normalized_mode

    records = list(feedback_collection.find(query).sort("_id", -1).limit(limit))

    if not records and normalized_mode:
        records = list(
            feedback_collection.find({"rating": rating}).sort("_id", -1).limit(limit)
        )

    return [r.get("answer", "") for r in records if r.get("answer")]


def get_bad_feedback_examples(mode=None, limit=5):
    return get_feedback_examples("bad", mode, limit)


def get_good_feedback_examples(mode=None, limit=3):
    return get_feedback_examples("good", mode, limit)


def build_improved_prompt(query, mode="beginner"):
    normalized_mode = normalize_mode(mode)

    bad_examples = get_bad_feedback_examples(normalized_mode)
    good_examples = get_good_feedback_examples(normalized_mode)

    avoid_text = "\n".join(bad_examples)
    prefer_text = "\n".join(good_examples)
    mode_rules = MODE_RULES[normalized_mode]

    return f"""
    You are a professional financial analyst.

    User mode:
    {normalized_mode}

    Response quality and quantity rules for this mode:
    {mode_rules}

    Learn from previous user feedback.

    Avoid repeating these answers or answer patterns users rated bad:
    {avoid_text if avoid_text else "No bad feedback examples yet."}

    Prefer the clarity and structure of these answers users rated good:
    {prefer_text if prefer_text else "No good feedback examples yet."}

    Improve answer quality using the feedback patterns above.
    Match the answer quantity to the user mode rules.
    Give clear reasoning, useful data or context when available, and never guarantee returns.
    
    Question:
    {query}
    """
