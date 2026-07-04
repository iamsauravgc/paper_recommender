FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir sentence-transformers==3.0.0
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x startup.sh

EXPOSE 7860

CMD ["bash", "startup.sh"]
