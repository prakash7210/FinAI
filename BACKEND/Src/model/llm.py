import base64
from io import BytesIO

from PIL import Image
from Src.model.config import GROQ_API_KEY, GROQ_VISION_MODELS
from Src.model.prompt import build_prompt
from groq import Groq
# Create client
client = Groq(api_key=GROQ_API_KEY)

def generate_answer(query, context="", mode="beginner"):
    try:
          # Determine user level based on query
        # Build prompt separately
        prompt = build_prompt(query, context, mode)

        # Call model
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            #conversation messages with system prompt and user query
            messages=[
                {"role": "system", "content": "You are a helpful and safe financial assistant."},
                {"role": "user", "content": prompt},
                
            ],
            #control randomness and creativity
            temperature=0.3
            #max_tokens=500
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Error: {str(e)}"


def _image_to_data_url(image_path):
    with Image.open(image_path) as opened_image:
        image = opened_image.copy()

    image.thumbnail((1600, 1600))

    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    quality = 85
    while quality >= 45:
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

        if len(encoded) < 3_900_000:
            buffer.close()
            return f"data:image/jpeg;base64,{encoded}"

        buffer.close()
        quality -= 10

    return f"data:image/jpeg;base64,{encoded}"


def generate_image_answer(image_path, query="", ocr_text=""):
    try:
        data_url = _image_to_data_url(image_path)
        question = query.strip() or "Identify this image and describe all important details."

        text_prompt = f"""
You are an expert image understanding assistant.

Analyze the image carefully before answering.

Required behavior:
- Identify the main subject, objects, scene, visible actions, and important visual details.
- If it is a document, screenshot, chart, table, receipt, ID, UI, product, handwritten note, or financial image, extract the useful information and summarize it.
- Answer the user's exact question directly using visual evidence from the image.
- If details are small or partially unclear, give the most likely interpretation and mention the visible clue.
- Do not say "I am not sure" unless the image is genuinely unreadable.
- Keep the answer concise, useful, and confident.

OCR text, if available:
{ocr_text or "No OCR text extracted."}

User question:
{question}
"""

        errors = []

        for model in GROQ_VISION_MODELS:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful assistant that understands images and answers directly.",
                        },
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": text_prompt},
                                {"type": "image_url", "image_url": {"url": data_url}},
                            ],
                        },
                    ],
                    temperature=0.1,
                    max_completion_tokens=1500,
                )

                return response.choices[0].message.content

            except Exception as model_error:
                errors.append(f"{model}: {model_error}")

        return f"Vision Error: {' | '.join(errors)}"

    except Exception as e:
        return f"Vision Error: {str(e)}"
