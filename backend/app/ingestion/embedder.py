"""Embedder — generates vector embeddings using Sentence Transformers.

Uses the all-MiniLM-L6-v2 model by default (384-dimensional vectors).
Falls back to all-MiniLM-L12-v2 if the primary model is unavailable.
"""

from __future__ import annotations

import os
import logging
from typing import Any

import numpy as np
from numpy.typing import NDArray

logger = logging.getLogger("docmind.embedder")


class Embedder:
    """Generate dense vector embeddings for text chunks.

    The model is lazy-loaded on first use to keep startup fast.

    Args:
        model_name: HuggingFace model identifier.
        device: 'cpu', 'cuda', or 'mps'. Auto-detected if None.
    """

    _model: Any = None

    def __init__(
        self,
        model_name: str | None = None,
        device: str | None = None,
    ) -> None:
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.device = device or self._auto_device()

    @classmethod
    def _auto_device(cls) -> str:
        """Detect the best available compute device."""
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"

    def _load_model(self) -> Any:
        """Lazy-load the Sentence Transformer model."""
        if self._model is not None:
            return self._model

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise RuntimeError(
                "sentence-transformers is required. "
                "Install with: pip install sentence-transformers"
            )

        logger.info("Loading embedding model '%s' on %s...", self.model_name, self.device)

        try:
            self._model = SentenceTransformer(self.model_name, device=self.device)
        except Exception as exc:
            logger.warning("Failed to load '%s': %s — trying fallback", self.model_name, exc)
            fallback = "all-MiniLM-L12-v2"
            self._model = SentenceTransformer(fallback, device=self.device)
            self.model_name = fallback

        logger.info(
            "Embedding model ready: %s (dim=%d)",
            self.model_name,
            self._model.get_sentence_embedding_dimension(),
        )
        return self._model

    def embed(self, texts: list[str]) -> NDArray[np.float32]:
        """Generate embeddings for a list of text strings.

        Args:
            texts: List of text strings to embed.

        Returns:
            NumPy array of shape (len(texts), embedding_dim).
        """
        if not texts:
            return np.array([], dtype=np.float32).reshape(0, 0)

        model = self._load_model()
        logger.info("Embedding %d text(s)...", len(texts))

        embeddings: NDArray[np.float32] = model.encode(
            texts,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

        logger.info("Embedded %d text(s) → shape %s", len(texts), embeddings.shape)
        return embeddings

    def embed_query(self, query: str) -> NDArray[np.float32]:
        """Generate an embedding for a single query string.

        Args:
            query: The search query.

        Returns:
            NumPy array of shape (embedding_dim,).
        """
        result = self.embed([query])
        return result[0]
