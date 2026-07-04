#!/usr/bin/env bash
set -euo pipefail

# ── DocMind Quick Start ────────────────────────────────────────────────
# This script pulls the Ollama model and starts the FastAPI server.

echo "🧠 DocMind — Enterprise Local RAG Platform"
echo "==========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.11+ is required. Install it from https://python.org"
    exit 1
fi

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Install it from https://ollama.com"
    exit 1
fi

# Start Ollama server if not running
echo "🦙 Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   Starting Ollama server..."
    ollama serve &
    sleep 3
fi

# Pull the model
MODEL=${OLLAMA_MODEL:-llama3.1:8b}
echo "📦 Pulling model '$MODEL' (this may take a few minutes)..."
ollama pull "$MODEL"

# Create virtual environment if needed
if [ ! -d ".venv" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate and install dependencies
echo "📥 Installing dependencies..."
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Create data directories
mkdir -p data/uploads data/chroma

# Copy .env if needed
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚙️  Created .env from .env.example"
fi

# Start the server
echo ""
echo "🚀 Starting DocMind API server..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Health: http://localhost:8000/api/health"
echo ""
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
