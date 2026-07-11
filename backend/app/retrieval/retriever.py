"""Retriever — semantic search over ChromaDB.

Embeds the user query and retrieves the top-K most similar
document chunks from the vector store.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.ingestion.embedder import Embedder
from app.chroma.vector_store import ChromaStore

logger = logging.getLogger("docmind.retriever")


@dataclass
class RetrievalResult:
    """A single retrieved chunk with relevance score."""
    text: str
    score: float
    metadata: dict[str, Any]


class Retriever:
    """Retrieve relevant document chunks for a query."""

    def __init__(
        self,
        store: ChromaStore,
        top_k: int = 3,
        min_score: float = 0.25,
    ) -> None:
        self.store = store
        self.top_k = top_k
        self.min_score = min_score
        self.embedder = Embedder()

    async def retrieve(self, query: str) -> list[RetrievalResult]:
        """Embed the query and search ChromaDB."""

        logger.info(
            "Retrieving top-%d results for query: '%s'",
            self.top_k,
            query[:100],
        )

        # Generate query embedding
        query_embedding = self.embedder.embed_query(query)

        # Search ChromaDB
        raw_results = await self.store.query(
            query_embedding=query_embedding.tolist(),
            n_results=self.top_k,
        )

        results: list[RetrievalResult] = []

        ids = raw_results.get("ids", [[]])[0]
        documents = raw_results.get("documents", [[]])[0]
        distances = raw_results.get("distances", [[]])[0]
        metadatas = raw_results.get("metadatas", [[]])[0]

        logger.info("Raw results returned: %d", len(ids))

        # Remove duplicate page results
        seen: set[str] = set()

        for doc_id, doc, dist, meta in zip(
            ids,
            documents,
            distances,
            metadatas,
        ):
            meta = meta or {}

            filename = meta.get("filename", "unknown")
            page = meta.get("page", 0)

            key = f"{filename}_{page}"

            if key in seen:
                logger.debug("Skipping duplicate result: %s", key)
                continue

            seen.add(key)

            # Chroma cosine distance → similarity score
            score = max(0.0, 1.0 - float(dist))

            logger.debug(
                "Result | id=%s | distance=%.4f | score=%.4f",
                doc_id,
                dist,
                score,
            )

            if score < self.min_score:
                continue

            results.append(
                RetrievalResult(
                    text=doc,
                    score=score,
                    metadata=meta,
                )
            )

        results.sort(key=lambda x: x.score, reverse=True)

        logger.info(
            "Retrieved %d result(s) after filtering",
            len(results),
        )

        return results