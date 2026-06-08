import numpy as np
from Src.RAG.embeddings import encode_texts


def is_relevant(query, context, threshold=0.5):
    """
    Semantic similarity check
    """

    q_emb, c_emb = encode_texts([query, context])

    similarity = np.dot(q_emb, c_emb) / (
        np.linalg.norm(q_emb) * np.linalg.norm(c_emb)
    )

    return similarity > threshold
