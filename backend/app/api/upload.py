"""Document upload endpoint.

Accepts PDF, DOCX, TXT, and Markdown files, runs the full
ingestion pipeline (load → chunk → embed → store), and returns
the resulting document ID and chunk count.
"""

from __future__ import annotations

import os
import shutil
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel

from app.ingestion.loader import DocumentLoader
from app.ingestion.chunker import TextChunker
from app.ingestion.embedder import Embedder

logger = logging.getLogger("docmind.upload")
router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS: set[str] = {"pdf", "docx", "txt", "md", "markdown"}


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks: int
    status: str


class UploadError(BaseModel):
    error: str
    detail: str | None = None


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={400: {"model": UploadError}, 500: {"model": UploadError}},
    summary="Upload and index a document",
)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Upload a document, chunk it, embed the chunks, and store in ChromaDB."""

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    ext = Path(file.filename).suffix.lstrip(".").lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    doc_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"

    try:
        with save_path.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as exc:
        logger.exception("Failed to save uploaded file")
        raise HTTPException(status_code=500, detail=f"File save error: {exc}")
    finally:
        await file.close()

    logger.info("Saved upload '%s' → %s", file.filename, save_path)

    store = request.app.state.store

    try:
        # 1. Load
        loader = DocumentLoader()
        pages = await loader.load(save_path, ext)
        if not pages:
            raise ValueError("No text content extracted from document")

        # 2. Chunk
        chunker = TextChunker(
    chunk_size=int(os.getenv("CHUNK_SIZE", "1000")),
    chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "200")),
)
        chunks = chunker.split(pages, metadata={"document_id": doc_id, "filename": file.filename})
        if not chunks:
            raise ValueError("Chunking produced zero chunks")

        # 3. Embed
        embedder = Embedder()
        embeddings = embedder.embed([c.text for c in chunks])

        # 4. Store
        await store.add_documents(
            ids=[f"{doc_id}_{i}" for i in range(len(chunks))],
            documents=[c.text for c in chunks],
            embeddings=embeddings.tolist(),
            metadatas=[c.metadata for c in chunks],
        )

        logger.info(
            "Ingested '%s': %d pages → %d chunks → stored", file.filename, len(pages), len(chunks)
        )

        return UploadResponse(
            document_id=doc_id,
            filename=file.filename,
            chunks=len(chunks),
            status="indexed",
        )

    except Exception as exc:
        logger.exception("Ingestion failed for '%s'", file.filename)
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=500, detail=f"Ingestion error: {exc}")
