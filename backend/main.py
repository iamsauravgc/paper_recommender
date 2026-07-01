import json
import arxiv
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = SentenceTransformer('all-MiniLM-L6-v2')

def get_papers():
    conn = sqlite3.connect('papers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, abstract, authors, url, category , embedding FROM papers')
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/recommend")
def recommend(payload: dict):
    arxiv_url = payload.get("url")

    if not arxiv_url or "arxiv.org" not in arxiv_url:
        raise HTTPException(status_code=400, detail="Invalid URL. Must be a valid ArXiv URL.")

    try:
        paper_id = arxiv_url.split("/")[-1]
        client = arxiv.Client()
        search = arxiv.Search(id_list=[paper_id])
        paper = next(client.results(search))
        abstract = paper.summary.replace('\n', ' ')
    except StopIteration:
        raise HTTPException(status_code=404, detail="Paper not found on ArXiv.")
    except Exception:
        raise HTTPException(status_code=502, detail="ArXiv API is temporarily unavailable.")

    input_embedding = model.encode(abstract).reshape(1, -1)

    papers = get_papers()

    similarities = []
    for row in papers:
        db_embedding = np.array(json.loads(row[6])).reshape(1, -1)
        score = cosine_similarity(input_embedding, db_embedding)[0][0]
        similarities.append((score, row))

    similarities.sort(key=lambda x: x[0], reverse=True)
    top20 = similarities[1:21]

    return {
        "input_paper": {
            "title": paper.title,
            "abstract": abstract,
        },
        "recommendations": [
            {
                "title": row[1],
                "abstract": row[2],
                "url": row[4],
                "category": row[5],
                "score": float(score)
            }
            for score, row in top20
        ]
    }

@app.get("/papers")
def get_papers_by_category(category: str = None):
    conn = sqlite3.connect('papers.db')
    cursor = conn.cursor()

    if category:
        cursor.execute(
            'SELECT id, title, abstract, authors, url, category FROM papers WHERE category = ? LIMIT 50',
            (category,)
        )
    else:
        cursor.execute(
            'SELECT id, title, abstract, authors, url, category FROM papers LIMIT 50'
        )

    rows = cursor.fetchall()
    conn.close()

    return {
        "papers": [
            {
                "id": row[0],
                "title": row[1],
                "abstract": row[2],
                "url": row[4],
                "category": row[5]
            }
            for row in rows
        ]
    }
