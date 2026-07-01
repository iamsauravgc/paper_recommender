import arxiv
import sqlite3
import json
from sentence_transformers import SentenceTransformer

CATEGORIES = [
    "machine learning",
    "deep learning",
    "computer vision",
    "natural language processing",
    "reinforcement learning",
    "robotics",
    "information retrieval",
    "algorithms and data structures",
    "software engineering",
    "cryptography",
    "databases",
    "distributed systems",
    "human computer interaction",
    "computer networks",
    "computer graphics",
    "multiagent systems",
    "computational complexity",
    "neural networks",
    "artificial intelligence",
    "causal inference",
]

def run_ingestion(max_per_category=300):
    print("Loading embedding model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    conn = sqlite3.connect("papers.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT,
            abstract TEXT,
            authors TEXT,
            url TEXT,
            embedding TEXT,
            category TEXT
        )
    """)
    conn.commit()

    client = arxiv.Client()
    total_inserted = 0

    for category in CATEGORIES:
        print(f"\nFetching papers for: {category}")

        search = arxiv.Search(
            query=category,
            max_results=max_per_category,
            sort_by=arxiv.SortCriterion.Relevance,
        )

        papers = list(client.results(search))
        print(f"Found {len(papers)} papers")

        for paper in papers:
            abstract = paper.summary.replace("\n", " ")
            embedding = model.encode(abstract).tolist()

            cursor.execute("""
                INSERT OR IGNORE INTO papers (id, title, abstract, authors, url, embedding, category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                paper.entry_id,
                paper.title,
                abstract,
                json.dumps([a.name for a in paper.authors]),
                paper.entry_id,
                json.dumps(embedding),
                category,
            ))

            total_inserted += cursor.rowcount

        conn.commit()
        print(f"Finished {category} ({total_inserted} new total)")

    conn.close()
    print(f"\nIngestion done. Total new papers: {total_inserted}")

    from index_builder import build_index
    build_index()

if __name__ == "__main__":
    run_ingestion()
