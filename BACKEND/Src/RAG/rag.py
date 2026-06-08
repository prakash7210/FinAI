import numpy as np
import faiss
import os
import hashlib
from DB.db import documents_collection
from bson import ObjectId
import pickle
from Src.RAG.embeddings import encode_texts

INDEX_FILE = "faiss_index.bin"
DOCMAP_FILE = "doc_map.pkl"
DIMENSION = 384

try:
    documents_collection.create_index([("userId", 1), ("chunkHash", 1)])
except Exception:
    pass

# Load index + mapping
if os.path.exists(INDEX_FILE):
    index = faiss.read_index(INDEX_FILE)

    with open(DOCMAP_FILE, "rb") as f:
        doc_ids = pickle.load(f)
else:
    index = faiss.IndexFlatL2(DIMENSION)
    doc_ids = []


# -----------------------------
# CHUNK TEXT
# -----------------------------
def chunk_text(text, chunk_size=200):
    words = text.split()
    return [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]


def _normalized_text(text):
    return " ".join((text or "").split()).strip().lower()


def content_hash(text):
    return hashlib.sha256(_normalized_text(text).encode("utf-8")).hexdigest()


# -----------------------------
# ADD DOCUMENTS (LINKED SYSTEM)
# -----------------------------
def add_documents(text_list, user_id=None):
    global doc_ids
    
    all_chunks = []
    new_doc_ids = []
    skipped_duplicates = 0

    for text in text_list:
        document_hash = content_hash(text)
        chunks = chunk_text(text)

        for chunk in chunks:
            chunk_hash = content_hash(chunk)
            duplicate_filter = {
                "userId": user_id,
                "$or": [
                    {"chunkHash": chunk_hash},
                    {"content": chunk},
                ],
            }

            if documents_collection.find_one(duplicate_filter, {"_id": 1}):
                skipped_duplicates += 1
                continue

            # Store in MongoDB
            result = documents_collection.insert_one({
                "content": chunk,
                "userId": user_id,
                "documentHash": document_hash,
                "chunkHash": chunk_hash,
            })

            doc_id = str(result.inserted_id)

            all_chunks.append(chunk)
            new_doc_ids.append(doc_id)

    if not all_chunks:
        return {"inserted": 0, "skipped": skipped_duplicates}

    embeddings = encode_texts(all_chunks, batch_size=16)

    index.add(np.array(embeddings).astype("float32"))

    doc_ids.extend(new_doc_ids) 

    # Save both
    faiss.write_index(index, INDEX_FILE)

    with open(DOCMAP_FILE, "wb") as f:
        pickle.dump(doc_ids, f)

    return {"inserted": len(new_doc_ids), "skipped": skipped_duplicates}

# -----------------------------
# RETRIEVE
# -----------------------------
def retrieve_docs(query, k=8, final_k=3, user_id=None):
    if not doc_ids:
        return ""

    query_embedding = encode_texts([query])

    _, indices = index.search(
        np.array(query_embedding).astype("float32"), k
    )

    results = []
    seen_hashes = set()

    for i in indices[0]:
        if i < len(doc_ids):
            doc_id = doc_ids[i]

            filter_query = {"_id": ObjectId(doc_id)}
            if user_id is not None:
                filter_query["userId"] = user_id

            doc = documents_collection.find_one(filter_query)
            if not doc:
                continue

            doc_hash = doc.get("chunkHash") or content_hash(doc.get("content", ""))
            if doc_hash not in seen_hashes:
                results.append(doc["content"])
                seen_hashes.add(doc_hash)

        if len(results) >= final_k:
            break

    return "\n".join(results)
