import re

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from bson import ObjectId
import os
from Src.api.auth import create_token, current_token_payload, current_user, hash_password, verify_password
from Src.api.schemas import AuthRequest, AuthResponse, FeedbackRequest, QueryRequest, QueryResponse
from Src.Services.integration import analyze
from Src.Services.feedback_service import store_feedback
from Src.api.logger import logger
from Src.model.llm import generate_image_answer

from DB.db import chats_collection, messages_collection, sessions_collection, users_collection
from DB.utils import serialize_chat, serialize_message

# 🔥 RAG IMPORTS
from Src.RAG.store import process_file, search

router = APIRouter()
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp", "gif"}
MAX_UPLOAD_BYTES = 12 * 1024 * 1024


def _normalize_email(email: str) -> str:
    return " ".join((email or "").strip().lower().split())


def _public_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name") or user.get("email", "").split("@")[0],
        "email": user.get("email"),
    }


def _safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", os.path.basename(name or "upload"))
    return cleaned[:120] or "upload"

# -----------------------------
# HEALTH CHECK
# -----------------------------
@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: AuthRequest, request: Request):
    email = _normalize_email(data.email)
    password = data.password or ""

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email is already registered")

    result = users_collection.insert_one({
        "name": (data.name or "").strip() or email.split("@")[0],
        "email": email,
        "passwordHash": hash_password(password),
    })
    user = users_collection.find_one({"_id": result.inserted_id})
    return {
        "token": create_token(user["_id"], request.headers.get("user-agent", "Unknown device")),
        "user": _public_user(user),
    }


@router.post("/auth/login", response_model=AuthResponse)
def login(data: AuthRequest, request: Request):
    email = _normalize_email(data.email)
    user = users_collection.find_one({"email": email})

    if not user or not verify_password(data.password or "", user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "token": create_token(user["_id"], request.headers.get("user-agent", "Unknown device")),
        "user": _public_user(user),
    }


@router.get("/auth/me")
def me(user=Depends(current_user)):
    return {"user": _public_user(user)}


@router.get("/auth/sessions")
def sessions(user=Depends(current_user)):
    active_sessions = sessions_collection.find({
        "userId": user["_id"],
        "active": True,
    }).sort("createdAt", -1).limit(10)
    return {
        "sessions": [
            {
                "id": s.get("jti"),
                "device": s.get("userAgent", "Unknown device"),
                "createdAt": s.get("createdAt"),
                "expiresAt": s.get("expiresAt"),
            }
            for s in active_sessions
        ]
    }


@router.post("/auth/logout")
def logout(payload=Depends(current_token_payload)):
    sessions_collection.update_one(
        {"jti": payload.get("jti")},
        {"$set": {"active": False}},
    )
    return {"status": "logged_out"}


# -----------------------------
# MAIN ANALYSIS (CHAT + RAG)
# -----------------------------
@router.post("/analyze", response_model=QueryResponse)
def analyze_query(request: QueryRequest, user=Depends(current_user)):
    try:
        query = (request.query or "").strip()
        chat_id = getattr(request, "chatId", None)
        file_name = getattr(request, "fileName", None)
        file_context = (getattr(request, "fileContext", None) or "").strip()

        logger.info(f"Query: {query} | chatId: {chat_id}")
        
        # ==============================
        #  CONTEXT (MEMORY + RAG)
        # ==============================
        context = ""

        #  CHAT MEMORY
        if chat_id:
            try:
                msgs = list(
                    messages_collection.find(
                        {"chatId": ObjectId(chat_id), "userId": user["_id"]}
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

        #  RAG CONTEXT
        if file_context:
            label = f" from {file_name}" if file_name else ""
            context += f"\nAttached File Data{label}:\n{file_context[:12000]}\n"

        if file_name and file_name.split(".")[-1].lower() in IMAGE_EXTENSIONS:
            image_path = os.path.join("data", os.path.basename(file_name))
            if os.path.exists(image_path):
                vision_answer = generate_image_answer(
                    image_path,
                    query=query,
                    ocr_text=file_context,
                )
                if not vision_answer.startswith("Vision Error:"):
                    return QueryResponse(
                        response=vision_answer,
                        source="vision",
                        confidence=0.92,
                        mode="vision",
                        latency=0,
                    )

                context += f"\nDirect Image Understanding from {file_name}:\n{vision_answer}\n"

        try:
            #  RAG CONTEXT
            rag_context = search(query or file_name or "", user_id=user["_id"])

            #  IMPORTANT FIX
            if not rag_context or rag_context.strip() == "":
                print(" No relevant RAG data")
                rag_context = ""
            else:
                print("Using RAG:", rag_context[:100])
                context += f"\nRelevant File Data:\n{rag_context}\n"

        except Exception as rag_error:
            logger.error(f"RAG error: {str(rag_error)}")

        # ==============================
        #  FINAL PROMPT
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
{query or "Analyze the attached file and give the most useful answer."}
"""

        result = analyze(final_query, user_id=user["_id"])

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
#@router.post("/loadpdf")
async def load_file(file: UploadFile = File(...), user=None):
    try:
        os.makedirs("data", exist_ok=True) #if folder alrdy exist dont throew error

        filename = file.filename or "upload"
        file_path = os.path.join("data", filename)# add file under data folder

        print("Uploading:", filename)

        total_size = 0
        with open(file_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break

                total_size += len(chunk)
                if total_size > MAX_UPLOAD_BYTES:
                    f.close()
                    os.remove(file_path)
                    raise HTTPException(status_code=413, detail="File is too large")

                f.write(chunk)

        ext = filename.split(".")[-1].lower()

        extracted_text = process_file(file_path, ext, user_id=user["_id"] if user else None) or ""

        return {
            "message": f"{ext.upper()} processed successfully",
            "filename": filename,
            "fileUrl": filename,
            "extractedText": extracted_text[:20000],
        }

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": str(e)}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(current_user)):
    safe_name = _safe_filename(file.filename or "upload")
    file.filename = f"{user['_id']}_{safe_name}"
    return await load_file(file, user=user)


# -----------------------------
# TITLE GENERATION
# -----------------------------
@router.post("/generate-title")
def generate_title(data: dict, user=Depends(current_user)):
    query = (data.get("query") or "New Chat").strip()
    title = " ".join(query.split())

    if len(title) > 38:
        title = f"{title[:38].rstrip()}..."

    return {"title": title or "New Chat"}


# -----------------------------
# CHAT MANAGEMENT
# -----------------------------
@router.post("/chats")
def create_chat(data: dict, user=Depends(current_user)):
    result = chats_collection.insert_one({
        "title": data.get("title", "New Chat"),
        "userId": user["_id"],
    })

    return {
        "id": str(result.inserted_id),
        "title": data.get("title", "New Chat")
    }


@router.get("/chats")
def get_chats(user=Depends(current_user)):
    chats = chats_collection.find({"userId": user["_id"]}).sort("_id", -1)
    return [serialize_chat(c) for c in chats]


@router.post("/messages")
def save_message(data: dict, user=Depends(current_user)):
    chat_id = ObjectId(data["chatId"])
    if not chats_collection.find_one({"_id": chat_id, "userId": user["_id"]}):
        raise HTTPException(status_code=404, detail="Chat not found")

    payload = {
        "chatId": chat_id,
        "userId": user["_id"],
        "text": data["text"],
        "isUser": data["isUser"],
    }

    if data.get("fileName"):
        payload["fileName"] = data["fileName"]
    if data.get("fileType"):
        payload["fileType"] = data["fileType"]
    if data.get("fileUrl"):
        payload["fileUrl"] = data["fileUrl"]

    result = messages_collection.insert_one(payload)
    return {
        "status": "saved",
        "id": str(result.inserted_id),
        "chatId": data["chatId"],
    }


@router.get("/chats/{chat_id}")
def get_chat_messages(chat_id: str, user=Depends(current_user)):
    msgs = messages_collection.find({
        "chatId": ObjectId(chat_id),
        "userId": user["_id"],
    }).sort("_id", 1)

    return {
        "messages": [serialize_message(m) for m in msgs]
    }


# -----------------------------
# FEEDBACK (RLHF)
# -----------------------------
@router.post("/feedback")
def feedback_api(data:FeedbackRequest, user=Depends(current_user)):
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
#update message  and delete message
@router.put("/messages/{message_id}")
def update_message(message_id: str, data: dict, user=Depends(current_user)):
    messages_collection.update_one(
        {"_id": ObjectId(message_id), "userId": user["_id"]},
        {"$set": {"text": data["text"]}}
    )
    return {"status": "updated"}


@router.delete("/messages/{message_id}")
def delete_message(message_id: str, user=Depends(current_user)):
    messages_collection.delete_one(
        {"_id": ObjectId(message_id), "userId": user["_id"]}
    )
    return {"status": "deleted"}

#update chat title and delete chat (which also deletes messages)
@router.put("/chats/{chat_id}")
def update_chat(chat_id: str, data: dict, user=Depends(current_user)):
    chats_collection.update_one(
        {"_id": ObjectId(chat_id), "userId": user["_id"]},
        {"$set": {"title": data["title"]}}
    )
    return {"status": "updated"}


@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str, user=Depends(current_user)):
    chats_collection.delete_one(
        {"_id": ObjectId(chat_id), "userId": user["_id"]}
    )
    messages_collection.delete_many(
        {"chatId": ObjectId(chat_id), "userId": user["_id"]}
    )
    return {"status": "deleted"}
