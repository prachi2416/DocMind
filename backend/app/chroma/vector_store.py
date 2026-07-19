"""ChromaDB vector store — persistent storage and similarity search.

Manages a ChromaDB collection for document embeddings with
full CRUD operations and cosine similarity queries.
"""

from __future__ import annotations

import os
import logging
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger("docmind.chroma")


class ChromaStore:
    """Async-compatible ChromaDB vector store.

    Uses ChromaDB's persistent client for data durability across
    restarts. The collection is created on initialization.

    Args:
        persist_dir: Directory for ChromaDB data storage.
        collection_name: Name of the ChromaDB collection.
    """

    def __init__(
        self,
        persist_dir: str | None = None,
        collection_name: str | None = None,
    ) -> None:
        self.persist_dir = persist_dir or os.getenv("CHROMA_DIR", "./data/chroma")
        self.collection_name = collection_name or os.getenv("CHROMA_COLLECTION", "docmind")
        self._client: chromadb.ClientAPI | None = None
        self._collection: chromadb.Collection | None = None

    async def initialize(self) -> None:
        """Initialize the ChromaDB client and collection."""
        os.makedirs(self.persist_dir, exist_ok=True)

        self._client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )

        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        count = self._collection.count()
        print("=" * 60)
        print("CHROMA COLLECTION :", self.collection_name)
        print("CHROMA DIRECTORY  :", self.persist_dir)
        print("TOTAL VECTORS     :", count)
        print("=" * 60)
        logger.info(
            "ChromaDB ready: collection='%s', %d existing vectors, dir='%s'",
            self.collection_name, count, self.persist_dir,
        )

    async def close(self) -> None:
        """Clean up resources."""
        self._client = None
        self._collection = None
        logger.info("ChromaDB connection closed")

    @property
    def collection(self) -> chromadb.Collection:
        """Get the active collection (raises if not initialized)."""
        if self._collection is None:
            raise RuntimeError("ChromaStore not initialized. Call initialize() first.")
        return self._collection

    async def add_documents(
        self,
        ids: list[str],
        documents: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]] | None = None,
    ) -> None:
        """Add documents with pre-computed embeddings."""
        self.collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas or [{}] * len(ids),
        )
        logger.info("Added %d documents to collection '%s'", len(ids), self.collection_name)

    async def query(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        where: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Query the collection by embedding vector."""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        logger.info("Query returned %d results", len(results.get("ids", [[]])[0]))
        return results

    async def query_by_text(
        self,
        query_texts: list[str],
        n_results: int = 5,
    ) -> dict[str, Any]:
        """Query the collection by text (ChromaDB handles embedding)."""
        results = self.collection.query(
            query_texts=query_texts,
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )
        return results

    async def delete_by_document_id(self, document_id: str) -> int:
        """Delete all chunks belonging to a document."""
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info("Deleted chunks for document_id='%s'", document_id)
            return 1
        except Exception as exc:
            logger.warning("Failed to delete document '%s': %s", document_id, exc)
            return 0

    async def heartbeat(self) -> dict[str, Any]:
        """Check if ChromaDB is responsive and return stats."""
        if self._client is None:
            return {"status": "not_initialized"}

        count = self.collection.count()
        return {
            "status": "healthy",
            "collections": 1,
            "vectors": count,
            "collection_name": self.collection_name,
        }

    async def get_stats(self) -> dict[str, Any]:
        """Return detailed collection statistics."""
        count = self.collection.count()
        peek = self.collection.peek(limit=5) if count > 0 else {"metadatas": []}

        doc_ids: set[str] = set()
        if peek.get("metadatas"):
            for meta in peek["metadatas"]:
                if meta and "document_id" in meta:
                    doc_ids.add(meta["document_id"])

        return {
            "total_chunks": count,
            "unique_documents": len(doc_ids),
            "collection_name": self.collection_name,
            "persist_directory": self.persist_dir,
        }
