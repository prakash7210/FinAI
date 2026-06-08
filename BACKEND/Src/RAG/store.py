import os
from Src.RAG.pdf import extract_text_from_pdf, extract_text_from_image, extract_text_from_txt, extract_text_from_docx
from Src.RAG.rag import add_documents, content_hash, index, doc_ids
from Src.model.llm import generate_image_answer
import numpy as np
from Src.RAG.embeddings import encode_texts
from DB.db import documents_collection
from bson import ObjectId


def process_file(file_path, ext, user_id=None):
    file_path = os.path.abspath(file_path)

    if not os.path.exists(file_path):
        print(" File not found:", file_path)
        return ""

    # ROUTE BASED ON TYPE
    if ext == "pdf":
        text = extract_text_from_pdf(file_path)

    elif ext in ["jpg", "jpeg", "png", "webp", "bmp", "gif"]:
        ocr_text = extract_text_from_image(file_path)
        vision_text = generate_image_answer(file_path, ocr_text=ocr_text)
        text = f"Vision analysis:\n{vision_text}\n\nOCR text:\n{ocr_text}".strip()

    elif ext == "txt":
        text = extract_text_from_txt(file_path)

    elif ext == "docx":
        text = extract_text_from_docx(file_path)

    else:
        print(" Unsupported file type:", ext)
        return ""

    if not text.strip(): 
        print(" No text extracted")
        return ""

    ingest_stats = add_documents([text], user_id=user_id) or {"inserted": 0, "skipped": 0}

    print(
        f" {ext.upper()} processed successfully | "
        f"inserted chunks: {ingest_stats['inserted']} | "
        f"skipped duplicates: {ingest_stats['skipped']}"
    )
    return text

def search(query, top_k=5, max_distance=None, user_id=None):
    
    if index.ntotal == 0:
        return ""

    query_embedding = encode_texts([query])

    distances, indices = index.search(
        np.array(query_embedding).astype("float32"),
        top_k
    )

    results = []
    seen_hashes = set()
    #it splits the results into 2 parts, the first part is the positions of the relevant documents and the second part is the document id 
    for i, idx in enumerate(indices[0]):
        score = distances[0][i]

        if max_distance is not None and score > max_distance:
            continue

        if idx < len(doc_ids):

            doc_id = doc_ids[idx]
            filter_query = {"_id": ObjectId(doc_id)}
            if user_id is not None:
                filter_query["userId"] = user_id

            doc = documents_collection.find_one(filter_query)

            if doc:
                doc_hash = doc.get("chunkHash") or content_hash(doc.get("content", ""))
                if doc_hash in seen_hashes:
                    continue

                results.append(doc["content"])
                seen_hashes.add(doc_hash)

    return "\n".join(results)
