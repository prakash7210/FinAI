from Src.api.routes import router
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title="Financial AI Analyst API",
    version="1.0.0"
)

# -----------------------------
# CORS CONFIG
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔥 allow all (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routes
app.include_router(router, prefix="/api")


# Root endpoint
@app.get("/")
def root():
    return {"message": "Financial AI Analyst API is running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)