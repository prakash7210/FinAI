from Src.RAG.store import index, doc_ids
from DB.db import documents_collection

print("⚠️ Clearing RAG data...")

documents_collection.delete_many({})
index.reset()
doc_ids.clear()

print("✅ RAG cleared successfully!")