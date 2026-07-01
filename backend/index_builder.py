import json
import pickle
import sqlite3
import numpy as np
from rank_bm25 import BM25Okapi

EMBEDDINGS_PATH = "embeddings.npy"
META_PATH = "papers_meta.json"
BM25_PATH = "bm25.pkl"

def build_index():
    conn = sqlite3.connect("papers.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, abstract, authors, url, category, embedding FROM papers")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        print("No papers in DB. Skipping index build.")
        return False

    embeddings = []
    meta = []
    tokenized = []

    for row in rows:
        embeddings.append(np.array(json.loads(row[6]), dtype=np.float32))
        meta.append({
            "id": row[0],
            "title": row[1],
            "abstract": row[2],
            "authors": row[3],
            "url": row[4],
            "category": row[5],
        })
        tokenized.append((row[2] or "").split())

    embedding_matrix = np.vstack(embeddings)
    norms = np.linalg.norm(embedding_matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    embedding_matrix = embedding_matrix / norms

    np.save(EMBEDDINGS_PATH, embedding_matrix)
    with open(META_PATH, "w") as f:
        json.dump(meta, f)

    bm25 = BM25Okapi(tokenized)
    with open(BM25_PATH, "wb") as f:
        pickle.dump(bm25, f)

    print(f"Index built: {len(meta)} papers")
    return True

if __name__ == "__main__":
    build_index()
