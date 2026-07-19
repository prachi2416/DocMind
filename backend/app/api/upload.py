"""Document upload endpoint.

Accepts PDF, DOCX, TXT, and Markdown files, runs the full
ingestion pipeline (load → chunk → embed → store), and returns
the resulting document ID and chunk count.
"""

from __future__ import annotations

import logging
import os
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.ingestion.chunker import TextChunker
from app.ingestion.embedder import Embedder
from app.ingestion.loader import DocumentLoader

logger = logging.getLogger("docmind.upload")
router = APIRouter()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md", "markdown"}


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
    responses={
        400: {"model": UploadError},
        500: {"model": UploadError},
    },
)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
) -> UploadResponse:

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    ext = Path(file.filename).suffix.lstrip(".").lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}",
        )

    doc_id = str(uuid.uuid4())

    save_path = UPLOAD_DIR / f"{doc_id}_{file.filename}"

    try:
        with save_path.open("wb") as f:
            shutil.copyfileobj(file.file, f)
    finally:
        await file.close()

    store = request.app.state.store

    try:
        # -------------------------
        # Load
        # -------------------------
        loader = DocumentLoader()

        pages = await loader.load(save_path, ext)

        if not pages:
            raise ValueError("No text extracted")

        # -------------------------
        # Chunk
        # -------------------------
        chunker = TextChunker(
            chunk_size=int(os.getenv("CHUNK_SIZE", "1000")),
            chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "200")),
        )

        chunks = chunker.split(
            pages,
            metadata={
                "document_id": doc_id,
                "filename": file.filename,
            },
        )

        if not chunks:
            raise ValueError("No chunks created")

        # -------------------------
        # Embed
        # -------------------------
        embedder = Embedder()

        embeddings = embedder.embed(
            [c.text for c in chunks]
        )

        # -------------------------
        # Store
        # -------------------------
        await store.add_documents(
            ids=[
                f"{doc_id}_{i}"
                for i in range(len(chunks))
            ],
            documents=[
                c.text
                for c in chunks
            ],
            embeddings=embeddings.tolist(),
            metadatas=[
                c.metadata
                for c in chunks
            ],
        )

        # -------------------------
        # Debug prints
        # -------------------------
        print("=" * 60)
        print("UPLOAD SUCCESS")
        print("FILE :", file.filename)
        print("CHUNKS :", len(chunks))
        print("TOTAL CHUNKS IN CHROMA :", store.collection.count())
        print("=" * 60)

        return UploadResponse(
            document_id=doc_id,
            filename=file.filename,
            chunks=len(chunks),
            status="indexed",
        )

    except Exception as exc:
        logger.exception("Upload failed")

        if save_path.exists():
            save_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )