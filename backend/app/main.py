"""DocMind — Enterprise Local RAG Platform

FastAPI backend for document ingestion, retrieval, and generation.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import upload, query, health
from app.chroma.vector_store import ChromaStore

logger = logging.getLogger("docmind")

store: ChromaStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    global store
    logger.info("DocMind starting — initializing ChromaDB store...")
    store = ChromaStore()
    await store.initialize()
    app.state.store = store
    logger.info("ChromaDB store ready.")
    yield
    logger.info("DocMind shutting down — closing ChromaDB connection...")
    if store:
        await store.close()
    logger.info("Done.")


app = FastAPI(
    title="DocMind",
    description="Enterprise Local RAG Platform — API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Ingestion"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(health.router, prefix="/api", tags=["System"])
