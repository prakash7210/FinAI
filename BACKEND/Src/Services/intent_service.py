from Src.model.llm import generate_answer


def classify_intent(query: str) -> str:
    """
    Uses LLM to classify query intent
    """

    prompt = f"""
    Classify the financial query into ONE category:

    Categories:
    1. REALTIME → current stock price, live market data, today's value
    2. COMPANY → company analysis, financial performance, reports
    3. GENERAL → concepts like inflation, investing basics

    Query: {query}

    Only output one word:
    REALTIME or COMPANY or GENERAL
    """

    response = generate_answer(prompt, "").strip().upper()

    if "REALTIME" in response:
        return "realtime"
    elif "COMPANY" in response:
        return "rag"
    else:
        return "llm"