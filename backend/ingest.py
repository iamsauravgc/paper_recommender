import arxiv
import sqlite3
import json
from sentence_transformers import SentenceTransformer

# Load embedding model
print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# Connect to SQLite database
conn = sqlite3.connect("papers.db")
cursor = conn.cursor()

# Create table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        title TEXT,
        abstract TEXT,
        authors TEXT,
        url TEXT,
        embedding TEXT
    )
""")

# Add category column if it doesn't already exist
cursor.execute("PRAGMA table_info(papers)")
columns = [column[1] for column in cursor.fetchall()]

if "category" not in columns:
    cursor.execute(
        "ALTER TABLE papers ADD COLUMN category TEXT"
    )
    print("Added category column.")

conn.commit()

# ArXiv categories to search
categories = [
    "machine learning",
    "computer vision",
    "natural language processing"
]

client = arxiv.Client()

total_inserted = 0

for category in categories:
    print(f"\nFetching papers for: {category}")

    search = arxiv.Search(
        query=category,
        max_results=200,
        sort_by=arxiv.SortCriterion.Relevance
    )

    papers = list(client.results(search))

    print(f"Found {len(papers)} papers")

    for paper in papers:
        abstract = paper.summary.replace("\n", " ")

        # Generate embedding
        embedding = model.encode(abstract).tolist()

        cursor.execute("""
            INSERT OR IGNORE INTO papers
            (
                id,
                title,
                abstract,
                authors,
                url,
                embedding,
                category
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            paper.entry_id,
            paper.title,
            abstract,
            json.dumps([author.name for author in paper.authors]),
            paper.entry_id,
            json.dumps(embedding),
            category
        ))

        total_inserted += cursor.rowcount

    conn.commit()
    print(f"Finished processing {category}")

conn.close()

print("\nDone!")
print(f"Total new papers inserted: {total_inserted}")
print("Database saved as papers.db")