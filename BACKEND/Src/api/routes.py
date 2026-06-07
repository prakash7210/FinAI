from fastapi import APIRouter, HTTPException, UploadFile, File
from bson import ObjectId
import os

from Src.api.schemas import FeedbackRequest, QueryRequest, QueryResponse
from Src.Services.integration import analyze
from Src.Services.feedback_service import store_feedback
from Src.api.logger import logger

from DB.db import chats_collection, messages_collection
from DB.utils import serialize_chat, serialize_message

# 🔥 RAG IMPORTS
from Src.RAG.store import process_file, search

router = APIRouter()

# -----------------------------
# HEALTH CHECK
# -----------------------------
@router.get("/health")
def health():
    return {"status": "ok"}


# -----------------------------
# MAIN ANALYSIS (CHAT + RAG)
# -----------------------------
@router.post("/analyze", response_model=QueryResponse)
def analyze_query(request: QueryRequest):
    try:
        query = request.query
        chat_id = getattr(request, "chatId", None)

        logger.info(f"Query: {query} | chatId: {chat_id}")

        # ==============================
        # 🔥 CONTEXT (MEMORY + RAG)
        # ==============================
        context = ""

        # 🧠 CHAT MEMORY
        if chat_id:
            try:
                msgs = list(
                    messages_collection.find(
                        {"chatId": ObjectId(chat_id)}
                    )
                    .sort("_id", -1)
                    .limit(5)
                )

                msgs.reverse()

                for m in msgs:
                    role = "User" if m["isUser"] else "Assistant"
                    context += f"{role}: {m['text']}\n"

            except Exception as db_error:
                logger.error(f"Memory error: {str(db_error)}")

        # 🔥 RAG CONTEXT
        try:
            # 🔥 RAG CONTEXT
            rag_context = search(query)

            # ✅ IMPORTANT FIX
            if not rag_context or rag_context.strip() == "":
                print("⚠️ No relevant RAG data")
                rag_context = ""
            else:
                print("✅ Using RAG:", rag_context[:100])
                context += f"\nRelevant File Data:\n{rag_context}\n"

        except Exception as rag_error:
            logger.error(f"RAG error: {str(rag_error)}")

        # ==============================
        # 🔥 FINAL PROMPT
        # ==============================
        final_query = f"""
You are an intelligent AI assistant.

Use the information below to answer:

{context}

Instructions:

- Use file data ONLY if relevant to the question
- If retrieved context is unrelated → ignore it
- Answer using general knowledge if needed
- If image question → describe based on reasoning

User Question:
{query}
"""

        result = analyze(final_query)

        return QueryResponse(
            response=result.get("response", ""),
            source=result.get("source", "ai"),
            confidence=result.get("confidence", 0.9),
            mode=result.get("mode"),
            latency=result.get("latency", 0),
        )

    except Exception as e:
        logger.error(f"Analyze Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# -----------------------------
# FILE UPLOAD (ALL TYPES)
# -----------------------------
@router.post("/loadpdf")
async def load_file(file: UploadFile = File(...)):
    try:
        os.makedirs("data", exist_ok=True)

        filename = file.filename or "upload"
        file_path = os.path.join("data", filename)

        print("Uploading:", filename)

        with open(file_path, "wb") as f:
            f.write(await file.read())

        ext = filename.split(".")[-1].lower()

        process_file(file_path, ext)

        return {
            "message": f"{ext.upper()} processed successfully",
            "filename": filename
        }

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": str(e)}


# -----------------------------
# CHAT MANAGEMENT
# -----------------------------
@router.post("/chats")
def create_chat(data: dict):
    result = chats_collection.insert_one({
        "title": data.get("title", "New Chat")
    })

    return {
        "id": str(result.inserted_id),
        "title": data.get("title", "New Chat")
    }


@router.get("/chats")
def get_chats():
    chats = chats_collection.find().sort("_id", -1)
    return [serialize_chat(c) for c in chats]


@router.post("/messages")
def save_message(data: dict):
    messages_collection.insert_one({
        "chatId": ObjectId(data["chatId"]),
        "text": data["text"],
        "isUser": data["isUser"]
    })
    return {"status": "saved"}


@router.get("/chats/{chat_id}")
def get_chat_messages(chat_id: str):
    msgs = messages_collection.find({
        "chatId": ObjectId(chat_id)
    }).sort("_id", 1)

    return {
        "messages": [serialize_message(m) for m in msgs]
    }


# -----------------------------
# FEEDBACK (RLHF)
# -----------------------------
@router.post("/feedback")
def feedback_api(data:FeedbackRequest):
    store_feedback(
        query=data.query,
        answer=data.answer,
        rating=data.rating,
        source=data.source,
        mode=data.mode,
    )
    return {"message": "Feedback saved"}


# -----------------------------
# UPDATE / DELETE
# -----------------------------
@router.put("/messages/{message_id}")
def update_message(message_id: str, data: dict):
    messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"text": data["text"]}}
    )
    return {"status": "updated"}


@router.delete("/messages/{message_id}")
def delete_message(message_id: str):
    messages_collection.delete_one(
        {"_id": ObjectId(message_id)}
    )
    return {"status": "deleted"}


@router.put("/chats/{chat_id}")
def update_chat(chat_id: str, data: dict):
    chats_collection.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"title": data["title"]}}
    )
    return {"status": "updated"}


@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    chats_collection.delete_one(
        {"_id": ObjectId(chat_id)}
    )
    messages_collection.delete_many(
        {"chatId": ObjectId(chat_id)}
    )
    return {"status": "deleted"}
