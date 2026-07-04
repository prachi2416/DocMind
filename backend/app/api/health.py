"""System health endpoints.

Reports the status of Ollama, ChromaDB, and the API itself.
"""

from __future__ import annotations

import os
import time
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel

logger = logging.getLogger("docmind.health")
router = APIRouter()


class ServiceStatus(BaseModel):
    service: str
    status: str  # healthy | degraded | down
    version: str | None = None
    detail: str | None = None
    latency_ms: float | None = None


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    uptime_seconds: float
    services: list[ServiceStatus]


START_TIME = time.monotonic()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System health check",
)
async def health_check(request: Request) -> HealthResponse:
    """Check the health of all dependent services."""
    services: list[ServiceStatus] = []

    # ChromaDB
    try:
        store = request.app.state.store
        chroma_info = await store.heartbeat()
        services.append(ServiceStatus(
            service="chromadb",
            status="healthy",
            detail=f"Collections: {chroma_info.get('collections', '?')}",
        ))
    except Exception as exc:
        services.append(ServiceStatus(service="chromadb", status="down", detail=str(exc)))

    # Ollama
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    try:
        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{ollama_url}/api/tags")
        latency = round((time.monotonic() - t0) * 1000, 1)

        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("name", "?") for m in data.get("models", [])]
            services.append(ServiceStatus(
                service="ollama",
                status="healthy",
                detail=f"Models: {', '.join(models[:3])}",
                latency_ms=latency,
            ))
        else:
            services.append(ServiceStatus(
                service="ollama", status="degraded", detail=f"HTTP {resp.status_code}", latency_ms=latency,
            ))
    except Exception as exc:
        services.append(ServiceStatus(service="ollama", status="down", detail=str(exc)))

    # FastAPI (self)
    services.append(ServiceStatus(service="fastapi", status="healthy"))

    statuses = {s.status for s in services}
    overall = "healthy" if statuses == {"healthy"} else "degraded" if "down" not in statuses else "down"

    return HealthResponse(
        status=overall,
        timestamp=datetime.now(timezone.utc),
        uptime_seconds=round(time.monotonic() - START_TIME, 1),
        services=services,
    )
