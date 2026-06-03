import arxiv
import sqlite3
import json
from sentence_transformers import SentenceTransformer

# Load the embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Connect to SQLite
conn = sqlite3.connect('papers.db')
cursor = conn.cursor()

# Create table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        title TEXT,
        abstract TEXT,
        authors TEXT,
        url TEXT,
        embedding TEXT
    )
''')
conn.commit()

# Fetch papers from ArXiv
client = arxiv.Client()
search = arxiv.Search(
    query="machine learning",
    max_results=500,
    sort_by=arxiv.SortCriterion.Relevance
)

print("Fetching papers...")
papers = list(client.results(search))
print(f"Got {len(papers)} papers")

# Generate embeddings and store
for paper in papers:
    abstract = paper.summary.replace('\n', ' ')
    embedding = model.encode(abstract).tolist()
    
    cursor.execute('''
        INSERT OR IGNORE INTO papers (id, title, abstract, authors, url, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        paper.entry_id,
        paper.title,
        abstract,
        json.dumps([a.name for a in paper.authors]),
        paper.entry_id,
        json.dumps(embedding)
    ))

conn.commit()
conn.close()
print("Done. Papers saved to papers.db")