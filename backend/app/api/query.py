"""RAG query endpoint.

Accepts a natural-language question, retrieves relevant chunks
from ChromaDB, and generates a grounded answer via Ollama.
"""

from __future__ import annotations

import os
import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.retrieval.retriever import Retriever
from app.generation.llm_client import OllamaClient

logger = logging.getLogger("docmind.query")
router = APIRouter()


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question")
    conversation_id: int | None = Field(None, description="Optional conversation ID")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")


class SourceCitation(BaseModel):
    document: str
    excerpt: str
    score: float
    page: int


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
    conversation_id: int | None = None


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Ask a question against your document library",
)
async def query_documents(
    body: QueryRequest,
    request: Request,
) -> QueryResponse:
    """Retrieve relevant chunks and generate an answer."""
    store = request.app.state.store

    try:
        retriever = Retriever(store=store, top_k=body.top_k)
        results = await retriever.retrieve(body.question)
    except Exception as exc:
        logger.exception("Retrieval failed")
        raise HTTPException(status_code=500, detail=f"Retrieval error: {exc}")

    if not results:
        return QueryResponse(
            answer="I couldn't find any relevant documents to answer your question. Please try uploading more documents or rephrasing your query.",
            sources=[],
            conversation_id=body.conversation_id,
        )

    context_parts: list[str] = []
    sources: list[SourceCitation] = []

    for r in results:
        context_parts.append(f"[Source: {r.metadata.get('filename', 'unknown')}, Page {r.metadata.get('page', 0)}]\n{r.text}")
        sources.append(SourceCitation(
            document=r.metadata.get("filename", "unknown"),
            excerpt=r.text[:300],
            score=round(r.score, 4),
            page=r.metadata.get("page", 0),
        ))

    context = "\n\n".join(context_parts)

    try:
        llm = OllamaClient(
            model=os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
            base_url=os.getenv("OLLAMA_URL", "http://localhost:11434"),
        )
        answer = await llm.generate(question=body.question, context=context)
    except Exception as exc:
        logger.exception("Generation failed")
        raise HTTPException(status_code=502, detail=f"LLM generation error: {exc}")

    return QueryResponse(
        answer=answer,
        sources=sources,
        conversation_id=body.conversation_id,
    )


@router.post(
    "/query/stream",
    summary="Ask a question with streaming response (SSE)",
)
async def query_stream(
    body: QueryRequest,
    request: Request,
) -> StreamingResponse:
    """Retrieve relevant chunks and stream the generated answer."""
    store = request.app.state.store

    try:
        retriever = Retriever(store=store, top_k=body.top_k)
        results = await retriever.retrieve(body.question)
    except Exception as exc:
        logger.exception("Retrieval failed")
        raise HTTPException(status_code=500, detail=f"Retrieval error: {exc}")

    context_parts: list[str] = []
    sources: list[dict] = []

    for r in results:
        context_parts.append(f"[Source: {r.metadata.get('filename', 'unknown')}, Page {r.metadata.get('page', 0)}]\n{r.text}")
        sources.append({
            "document": r.metadata.get("filename", "unknown"),
            "excerpt": r.text[:300],
            "score": round(r.score, 4),
            "page": r.metadata.get("page", 0),
        })

    context = "\n\n".join(context_parts)

    llm = OllamaClient(
        model=os.getenv("OLLAMA_MODEL", "llama3.2:3b"),
        base_url=os.getenv("OLLAMA_URL", "http://localhost:11434"),
    )

    async def event_generator() -> AsyncIterator[str]:
        yield f"data: {json.dumps({'sources': sources})}\n\n"

        try:
            async for token in llm.stream(question=body.question, context=context):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            logger.exception("Streaming error")
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
