from pydantic import BaseModel


class QueryRequest(BaseModel):
    query: str


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
