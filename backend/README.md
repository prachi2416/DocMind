# DocMind Backend

Enterprise-grade FastAPI backend for the DocMind RAG platform.

## Quick Start

```bash
# Option 1: Using the start script
chmod +x start.sh
./start.sh

# Option 2: Manual setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Docker

```bash
# Start all services
docker-compose up -d

# Pull the Ollama model
docker exec docmind-ollama ollama pull llama3.1:8b
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload and index a document |
| POST | `/api/query` | Query with full response |
| POST | `/api/query/stream` | Query with SSE streaming |
| GET | `/api/health` | System health check |

## Architecture

```
Upload → Loader → Chunker → Embedder → ChromaDB
Query  → Embedder → Retriever → LLM (Ollama) → Response
```

## Configuration

See `.env.example` for all available environment variables.
