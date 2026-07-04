---
title: ArXiv Paper Recommender
emoji: 📄
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# ArXiv Paper Recommender

Paste an ArXiv paper link and instantly find semantically similar research papers ranked by match score.

- **ML:** Sentence Transformers (`all-MiniLM-L6-v2`), Cosine Similarity + BM25 hybrid
- **Backend:** Python, FastAPI, SQLite
- **Data:** 20 CS categories from ArXiv API

## API Endpoints

- `POST /recommend` — Find similar papers given an ArXiv URL
- `GET /papers` — Browse papers by category
- `GET /papers/search?q=...` — Semantic search
- `GET /papers/{id}` — Paper details
- `POST /auth/login` — Firebase Auth login
- `GET /bookmarks` — User bookmarks (auth required)

## Environment Variables

Set these as Space Secrets:

| Variable | Required | Description |
|---|---|---|
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins (e.g. your frontend URL) |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `ADMIN_API_KEY` | ❌ | Key for `/ingest` and `/rebuild-index` endpoints |
| `ENABLE_SCHEDULER` | ❌ | Set `true` to enable daily auto-ingestion |
