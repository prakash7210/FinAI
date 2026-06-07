import faiss
import pickle
from DB.db import documents_collection
from Src.RAG.rag import index, doc_ids, INDEX_FILE, DOCMAP_FILE

print("FAISS LOADED:", faiss)
print("Has read_index:", hasattr(faiss, "read_index"))
print(index.ntotal)

index.reset()
doc_ids.clear()

faiss.write_index(index, INDEX_FILE)

with open(DOCMAP_FILE, "wb") as f:
    pickle.dump(doc_ids, f)

documents_collection.delete_many({})

print("FAISS index and DB cleared")
