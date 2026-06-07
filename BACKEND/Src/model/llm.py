from Src.model.config import GROQ_API_KEY
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
            messages=[
                {"role": "system", "content": "You are a helpful and safe financial assistant."},
                {"role": "user", "content": prompt}
                
            ],
            temperature=0.2
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Error: {str(e)}"
