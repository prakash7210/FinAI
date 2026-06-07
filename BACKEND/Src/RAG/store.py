import os
from Src.RAG.pdf import extract_text_from_pdf, extract_text_from_image, extract_text_from_txt, extract_text_from_docx
from Src.RAG.rag import add_documents, index, doc_ids
import numpy as np
from sentence_transformers import SentenceTransformer
from DB.db import documents_collection
from bson import ObjectId


model = SentenceTransformer("all-MiniLM-L6-v2")
def process_file(file_path, ext):
    file_path = os.path.abspath(file_path)

    if not os.path.exists(file_path):
        print("❌ File not found:", file_path)
        return

    # 🔥 ROUTE BASED ON TYPE
    if ext == "pdf":
        text = extract_text_from_pdf(file_path)

    elif ext in ["jpg", "jpeg", "png"]:
        text = extract_text_from_image(file_path)

    elif ext == "txt":
        text = extract_text_from_txt(file_path)

    elif ext == "docx":
        text = extract_text_from_docx(file_path)

    else:
        print("❌ Unsupported file type:", ext)
        return

    if not text.strip():
        print("⚠️ No text extracted")
        return

    add_documents([text])

    print(f"✅ {ext.upper()} processed successfully")

def search(query, top_k=5, threshold=0.6):
    
    if index.ntotal == 0:
        return ""

    query_embedding = model.encode([query])

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    results = []

    for i, idx in enumerate(indices[0]):
        score = distances[0][i]

        # 🔥 FILTER IRRELEVANT RESULTS
        if score < threshold:
            continue

        if idx < len(doc_ids):

            doc_id = doc_ids[idx]
            doc = documents_collection.find_one({"_id": ObjectId(doc_id)})

            if doc:
                results.append(doc["content"])

    return "\n".join(results)