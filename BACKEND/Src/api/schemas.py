from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str
    chatId: str | None = None
    fileName: str | None = None
    fileContext: str | None = None


class QueryResponse(BaseModel):
    response: str
    source: str
    confidence: float
    mode: str | None = None
    latency: float


class FeedbackRequest(BaseModel):
    query: str
    answer: str
    rating: str
    source: str
    mode: str | None = None


class AuthRequest(BaseModel):
    name: str | None = None
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict
