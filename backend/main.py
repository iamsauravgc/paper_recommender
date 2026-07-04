import json
import os
import pickle
import re
from urllib.parse import urlparse, quote
import sqlite3
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
from auth import verify_token, require_user

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

def init_user_tables():
    conn = sqlite3.connect("papers.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            email TEXT,
            name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid TEXT NOT NULL,
            paper_url TEXT NOT NULL,
            title TEXT,
            abstract TEXT,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_uid) REFERENCES users(uid),
            UNIQUE(user_uid, paper_url)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_uid TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_uid) REFERENCES users(uid)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS collection_papers (
            collection_id INTEGER NOT NULL,
            paper_url TEXT NOT NULL,
            title TEXT,
            abstract TEXT,
            category TEXT,
            PRIMARY KEY (collection_id, paper_url),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app):
    init_user_tables()
    if os.getenv("ENABLE_SCHEDULER", "").lower() == "true":
        from ingest import run_ingestion
        scheduler.add_job(run_ingestion, "interval", hours=24)
        scheduler.start()
    yield
    if scheduler.running:
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
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

def verify_admin(request: Request):
    if not ADMIN_API_KEY:
        return
    key = request.headers.get("X-API-Key", "")
    if key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key.")

def get_db():
    return sqlite3.connect("papers.db")

# ── Recommend ──────────────────────────────────────────────────────────

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
    except (ValueError, AttributeError):
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

# ── Papers ──────────────────────────────────────────────────────────────

@app.get("/papers")
def get_papers_by_category(category: str = None):
    conn = get_db()
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

@app.get("/papers/search")
def search_papers(q: str = "", page: int = 1):
    if not q.strip():
        return {"papers": [], "total": 0}
    if len(q) > 200:
        raise HTTPException(status_code=400, detail="Query too long (max 200 characters).")

    if embeddings is None or papers_meta is None:
        raise HTTPException(status_code=503, detail="Paper index not loaded. Run ingestion first.")

    query_emb = model.encode(q.strip()).reshape(1, -1).astype(np.float32)
    query_emb = query_emb / np.linalg.norm(query_emb)

    emb_scores = (query_emb @ embeddings.T).flatten()

    if bm25:
        query_tokens = q.strip().split()
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
    total = len(top_indices)

    per_page = 50
    start = (page - 1) * per_page
    page_indices = top_indices[start:start + per_page]

    return {
        "papers": [
            {
                "id": papers_meta[idx].get("id", ""),
                "title": papers_meta[idx]["title"],
                "abstract": papers_meta[idx]["abstract"],
                "url": papers_meta[idx]["url"],
                "category": papers_meta[idx]["category"],
                "score": float(combined[idx]),
            }
            for idx in page_indices
        ],
        "total": total,
    }

@app.get("/papers/{paper_id}")
def get_paper(paper_id: str):
    clean_id = paper_id.strip("/").split("/")[-1]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, abstract, authors, url, category FROM papers WHERE id LIKE ? LIMIT 1",
        (f"%{clean_id}%",),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Paper not found.")

    return {
        "id": row[0],
        "title": row[1],
        "abstract": row[2],
        "authors": json.loads(row[3]) if row[3] else [],
        "url": row[4],
        "category": row[5],
    }

@app.get("/papers/{paper_id}/bibtex")
def get_paper_bibtex(paper_id: str):
    clean_id = paper_id.strip("/").split("/")[-1]
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, title, abstract, authors, url, category FROM papers WHERE id LIKE ? LIMIT 1",
        (f"%{clean_id}%",),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Paper not found.")

    title = row[1]
    authors = json.loads(row[3]) if row[3] else []
    url = row[4] or clean_id
    from datetime import datetime
    year = str(datetime.now().year)

    bib_id = re.sub(r"[^a-zA-Z0-9]", "", title.split(" ")[0] if title else "paper")[:20]
    author_str = " and ".join(authors) if authors else "Unknown"

    bibtex = f"""@misc{{{bib_id},
  author = {{{author_str}}},
  title = {{{title}}},
  year = {{{year}}},
  url = {{{url}}},
}}"""

    return bibtex

# ── Auth ────────────────────────────────────────────────────────────────

@app.post("/auth/login")
def auth_login(payload: dict):
    from firebase_config import PROJECT_ID, verify_firebase_token
    if not PROJECT_ID:
        raise HTTPException(status_code=501, detail="FIREBASE_PROJECT_ID not set on server.")

    token = payload.get("token", "")
    if not token:
        raise HTTPException(status_code=400, detail="Missing token.")

    decoded = verify_firebase_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid token.")

    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name", "")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO users (uid, email, name) VALUES (?, ?, ?)",
        (uid, email, name),
    )
    cursor.execute(
        "UPDATE users SET email = ?, name = ? WHERE uid = ?",
        (email, name, uid),
    )
    conn.commit()
    conn.close()

    return {"uid": uid, "email": email, "name": name}

@app.get("/auth/me")
def auth_me(request: Request):
    user = verify_token(request)
    if not user:
        return {"user": None}
    return {"user": user}

# ── Bookmarks ───────────────────────────────────────────────────────────

@app.get("/bookmarks")
def list_bookmarks(request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, paper_url, title, abstract, category FROM bookmarks WHERE user_uid = ? ORDER BY created_at DESC",
        (user["uid"],),
    )
    rows = cursor.fetchall()
    conn.close()

    return {
        "bookmarks": [
            {
                "id": row[0],
                "url": row[1],
                "title": row[2],
                "abstract": row[3],
                "category": row[4],
            }
            for row in rows
        ]
    }

@app.post("/bookmarks")
def add_bookmark(request: Request, payload: dict):
    user = require_user(request)

    paper_url = payload.get("url", "")
    title = payload.get("title", "")
    abstract = payload.get("abstract", "")
    category = payload.get("category", "")

    if not paper_url:
        raise HTTPException(status_code=400, detail="Missing paper URL.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO bookmarks (user_uid, paper_url, title, abstract, category) VALUES (?, ?, ?, ?, ?)",
            (user["uid"], paper_url, title, abstract, category),
        )
        conn.commit()
        bookmark_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="Paper already bookmarked.")
    conn.close()

    return {"id": bookmark_id, "url": paper_url, "title": title}

@app.delete("/bookmarks/{paper_url:path}")
def remove_bookmark(paper_url: str, request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM bookmarks WHERE user_uid = ? AND paper_url = ?",
        (user["uid"], paper_url),
    )
    conn.commit()
    conn.close()
    return {"status": "deleted"}

# ── Collections ─────────────────────────────────────────────────────────

@app.get("/collections")
def list_collections(request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, description FROM collections WHERE user_uid = ? ORDER BY created_at DESC",
        (user["uid"],),
    )
    rows = cursor.fetchall()

    collections = []
    for row in rows:
        cursor.execute(
            "SELECT COUNT(*) FROM collection_papers WHERE collection_id = ?",
            (row[0],),
        )
        count = cursor.fetchone()[0]
        collections.append({
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "paper_count": count,
        })

    conn.close()
    return {"collections": collections}

@app.post("/collections")
def create_collection(request: Request, payload: dict):
    user = require_user(request)
    name = payload.get("name", "").strip()
    description = payload.get("description", "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Collection name is required.")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO collections (user_uid, name, description) VALUES (?, ?, ?)",
        (user["uid"], name, description),
    )
    conn.commit()
    cid = cursor.lastrowid
    conn.close()

    return {"id": cid, "name": name, "description": description}

@app.put("/collections/{col_id}")
def update_collection(col_id: int, request: Request, payload: dict):
    user = require_user(request)
    name = payload.get("name", "").strip()
    description = payload.get("description", "").strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE collections SET name = COALESCE(NULLIF(?, ''), name), description = ? WHERE id = ? AND user_uid = ?",
        (name, description, col_id, user["uid"]),
    )
    conn.commit()
    conn.close()
    return {"status": "updated"}

@app.delete("/collections/{col_id}")
def delete_collection(col_id: int, request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM collections WHERE id = ? AND user_uid = ?", (col_id, user["uid"]))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.post("/collections/{col_id}/papers")
def add_to_collection(col_id: int, request: Request, payload: dict):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM collections WHERE id = ? AND user_uid = ?", (col_id, user["uid"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Collection not found.")

    paper_url = payload.get("url", "")
    title = payload.get("title", "")
    abstract = payload.get("abstract", "")
    category = payload.get("category", "")

    try:
        cursor.execute(
            "INSERT INTO collection_papers (collection_id, paper_url, title, abstract, category) VALUES (?, ?, ?, ?, ?)",
            (col_id, paper_url, title, abstract, category),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=409, detail="Paper already in collection.")
    conn.close()

    return {"status": "added"}

@app.delete("/collections/{col_id}/papers/{paper_url:path}")
def remove_from_collection(col_id: int, paper_url: str, request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM collections WHERE id = ? AND user_uid = ?", (col_id, user["uid"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Collection not found.")

    cursor.execute(
        "DELETE FROM collection_papers WHERE collection_id = ? AND paper_url = ?",
        (col_id, paper_url),
    )
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.get("/collections/{col_id}/papers")
def list_collection_papers(col_id: int, request: Request):
    user = require_user(request)
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM collections WHERE id = ? AND user_uid = ?", (col_id, user["uid"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Collection not found.")

    cursor.execute(
        "SELECT paper_url, title, abstract, category FROM collection_papers WHERE collection_id = ? ORDER BY rowid DESC",
        (col_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    return {
        "papers": [
            {"url": r[0], "title": r[1], "abstract": r[2], "category": r[3]}
            for r in rows
        ]
    }

# ── Admin ───────────────────────────────────────────────────────────────

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
