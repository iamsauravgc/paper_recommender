import json
import arxiv
import sqlite3
from fastapi import FastAPI
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
    cursor.execute('SELECT id, title, abstract, authors, url, embedding FROM papers')
    rows = cursor.fetchall()
    conn.close()
    return rows

@app.post("/recommend")
def recommend(payload: dict):
    arxiv_url = payload.get("url")
    
    # Fetch the paper abstract from ArXiv
    paper_id = arxiv_url.split("/")[-1]
    client = arxiv.Client()
    search = arxiv.Search(id_list=[paper_id])
    paper = next(client.results(search))
    abstract = paper.summary.replace('\n', ' ')
    
    # Embed the input paper
    input_embedding = model.encode(abstract).reshape(1, -1)
    
    # Load all papers from DB
    papers = get_papers()
    
    # Compute similarities
    similarities = []
    for row in papers:
        db_embedding = np.array(json.loads(row[5])).reshape(1, -1)
        score = cosine_similarity(input_embedding, db_embedding)[0][0]
        similarities.append((score, row))
    
    # Sort by similarity
    similarities.sort(key=lambda x: x[0], reverse=True)
    top5 = similarities[1:6]
    
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
                "score": float(score)
            }
            for score, row in top5
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