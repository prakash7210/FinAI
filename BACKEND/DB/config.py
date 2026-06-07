import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB connection string
MONGO_URI = os.getenv("MONGO_URI")