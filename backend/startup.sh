#!/bin/bash
set -e

if [ ! -f papers.db ] || [ ! -f embeddings.npy ]; then
    echo "No DB or index found. Running initial ingestion (this takes ~15 min)..."
    python ingest.py
    echo "Ingestion complete."
fi

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 7860
