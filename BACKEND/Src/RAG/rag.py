import numpy as np
import faiss
import os
from sentence_transformers import SentenceTransformer
from DB.db import documents_collection
from bson import ObjectId
import pickle

MODEL_NAME = "all-MiniLM-L6-v2"
INDEX_FILE = "faiss_index.bin"
DOCMAP_FILE = "doc_map.pkl"
DIMENSION = 384

model = SentenceTransformer(MODEL_NAME)

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


# -----------------------------
# ADD DOCUMENTS (LINKED SYSTEM)
# -----------------------------
def add_documents(text_list):
    global doc_ids
    
    all_chunks = []
    new_doc_ids = []

    for text in text_list:
        chunks = chunk_text(text)

        for chunk in chunks:
            # Store in MongoDB
            result = documents_collection.insert_one({
                "content": chunk
            })

            doc_id = str(result.inserted_id)

            all_chunks.append(chunk)
            new_doc_ids.append(doc_id)

    embeddings = model.encode(all_chunks, batch_size=32)

    index.add(np.array(embeddings).astype("float32"))

    doc_ids.extend(new_doc_ids)

    # Save both
    faiss.write_index(index, INDEX_FILE)

    with open(DOCMAP_FILE, "wb") as f:
        pickle.dump(doc_ids, f)


# -----------------------------
# RETRIEVE
# -----------------------------
def retrieve_docs(query, k=8, final_k=3):
    if not doc_ids:
        return ""

    query_embedding = model.encode([query])

    _, indices = index.search(
        np.array(query_embedding).astype("float32"), k
    )

    results = []
    seen = set()

    for i in indices[0]:
        if i < len(doc_ids):
            doc_id = doc_ids[i]

            if doc_id not in seen:
                doc = documents_collection.find_one({
                    "_id": ObjectId(doc_id)
                })

                if doc:
                    results.append(doc["content"])
                    seen.add(doc_id)

        if len(results) >= final_k:
            break

    return "\n".join(results)