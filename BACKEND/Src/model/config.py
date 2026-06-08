import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_VISION_MODELS = [
    model.strip()
    for model in os.getenv(
        "GROQ_VISION_MODELS",
        "meta-llama/llama-4-maverick-17b-128e-instruct,"
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ).split(",")
    if model.strip()
]
