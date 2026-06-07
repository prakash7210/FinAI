from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")


def is_relevant(query, context, threshold=0.5):
    """
    Semantic similarity check
    """

    q_emb = model.encode([query])[0]
    c_emb = model.encode([context])[0]

    similarity = np.dot(q_emb, c_emb) / (
        np.linalg.norm(q_emb) * np.linalg.norm(c_emb)
    )

    return similarity > threshold