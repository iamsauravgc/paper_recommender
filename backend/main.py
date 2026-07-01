import json
import os
import pickle
from urllib.parse import urlparse
import arxiv
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sentence_transformers import SentenceTransformer
from apscheduler.schedulers.background import BackgroundScheduler
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

EMBEDDINGS_PATH = "embeddings.npy"
META_PATH = "papers_meta.json"
BM25_PATH = "bm25.pkl"
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

model = SentenceTransformer("all-MiniLM-L6-v2")

embeddings = None
papers_meta = None
bm25 = None

def load_index():
    global embeddings, papers_meta, bm25
    if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(META_PATH):
        embeddings = np.load(EMBEDDINGS_PATH)
        with open(META_PATH) as f:
            papers_meta = json.load(f)
        if os.path.exists(BM25_PATH):
            with open(BM25_PATH, "rb") as f:
                bm25 = pickle.load(f)
        print(f"Loaded index: {len(papers_meta)} papers")
    else:
        print("No index found. Run ingest.py first.")

load_index()

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app):
    from ingest import run_ingestion
    scheduler.add_job(run_ingestion, "interval", hours=24)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

def verify_admin(request: Request):
    if not ADMIN_API_KEY:
        return
    key = request.headers.get("X-API-Key", "")
    if key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key.")

@app.post("/recommend")
@limiter.limit("30/minute")
def recommend(request: Request, payload: dict):
    arxiv_url = payload.get("url")

    if not arxiv_url:
        raise HTTPException(status_code=400, detail="Missing URL.")

    try:
        parsed = urlparse(arxiv_url)
        if not parsed.scheme or not parsed.netloc or not parsed.netloc.endswith("arxiv.org"):
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL. Must be a valid ArXiv URL.")

    try:
        paper_id = arxiv_url.split("/")[-1]
        client = arxiv.Client()
        search = arxiv.Search(id_list=[paper_id])
        paper = next(client.results(search))
        abstract = paper.summary.replace("\n", " ")
    except StopIteration:
        raise HTTPException(status_code=404, detail="Paper not found on ArXiv.")
    except Exception:
        raise HTTPException(status_code=502, detail="ArXiv API is temporarily unavailable.")

    if embeddings is None or papers_meta is None:
        raise HTTPException(status_code=503, detail="Paper index not loaded. Run ingestion first.")

    query_emb = model.encode(abstract).reshape(1, -1).astype(np.float32)
    query_emb = query_emb / np.linalg.norm(query_emb)

    emb_scores = (query_emb @ embeddings.T).flatten()

    if bm25:
        query_tokens = abstract.split()
        bm25_scores = np.array(bm25.get_scores(query_tokens))
        bm25_min, bm25_max = bm25_scores.min(), bm25_scores.max()
        if bm25_max > bm25_min:
            bm25_norm = (bm25_scores - bm25_min) / (bm25_max - bm25_min)
        else:
            bm25_norm = np.zeros_like(bm25_scores)
        combined = 0.3 * bm25_norm + 0.7 * emb_scores
    else:
        combined = emb_scores

    top_indices = np.argsort(combined)[::-1]

    input_entry_id = f"http://arxiv.org/abs/{paper_id}_v1"

    recommendations = []
    for idx in top_indices:
        if papers_meta[idx]["id"] == input_entry_id:
            continue
        recommendations.append({
            "title": papers_meta[idx]["title"],
            "abstract": papers_meta[idx]["abstract"],
            "url": papers_meta[idx]["url"],
            "category": papers_meta[idx]["category"],
            "score": float(combined[idx]),
        })
        if len(recommendations) == 20:
            break

    return {
        "input_paper": {
            "title": paper.title,
            "abstract": abstract,
        },
        "recommendations": recommendations,
    }

@app.get("/papers")
def get_papers_by_category(category: str = None):
    import sqlite3
    conn = sqlite3.connect("papers.db")
    cursor = conn.cursor()

    if category:
        cursor.execute(
            "SELECT id, title, abstract, authors, url, category FROM papers WHERE category = ? LIMIT 50",
            (category,),
        )
    else:
        cursor.execute(
            "SELECT id, title, abstract, authors, url, category FROM papers LIMIT 50"
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
                "category": row[5],
            }
            for row in rows
        ]
    }

@app.post("/ingest")
@limiter.limit("1/minute")
def trigger_ingest(request: Request):
    verify_admin(request)
    from ingest import run_ingestion
    try:
        run_ingestion()
        return {"status": "ok", "message": "Ingestion complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rebuild-index")
@limiter.limit("1/minute")
def trigger_rebuild(request: Request):
    verify_admin(request)
    from index_builder import build_index
    try:
        build_index()
        load_index()
        return {"status": "ok", "message": "Index rebuilt"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
