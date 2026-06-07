from pymongo import MongoClient
from DB.config import MONGO_URI

# Create MongoDB client
client = MongoClient(MONGO_URI)

# Create database
db = client["financial_ai_db"]

# Collections (like tables)
queries_collection = db["queries"]
feedback_collection = db["feedback"]
documents_collection = db["documents"]
chats_collection = db["chats"]
messages_collection = db["messages"]