"""Text chunker — splits documents into overlapping chunks.

Uses recursive character splitting that respects paragraph
and sentence boundaries before falling back to character-level splits.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.ingestion.loader import Page

logger = logging.getLogger("docmind.chunker")


@dataclass
class Chunk:
    """A single text chunk with metadata."""
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    index: int = 0


class TextChunker:
    """Split document pages into semantically meaningful chunks.

    Uses recursive character splitting that tries to keep paragraphs
    and sentences together before falling back to character-level splits.

    Args:
        chunk_size: Maximum number of characters per chunk.
        chunk_overlap: Number of overlapping characters between chunks.
        separators: Custom separator hierarchy.
    """

    DEFAULT_SEPARATORS: list[str] = [
        "\n\n",
        "\n",
        ". ",
        "? ",
        "! ",
        ", ",
        " ",
        "",
    ]

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: list[str] | None = None,
    ) -> None:
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or self.DEFAULT_SEPARATORS

    def split(
        self,
        pages: list[Page],
        metadata: dict[str, Any] | None = None,
    ) -> list[Chunk]:
        """Split pages into chunks."""

        if not pages:
            return []

        base_meta = metadata or {}
        chunks: list[Chunk] = []
        chunk_index = 0

        for page in pages:
            page_text = page.text.strip()

            if not page_text:
                continue

            # Small page → single chunk
            if len(page_text) <= self.chunk_size:
                chunk_meta = {
                    **base_meta,
                    **page.metadata,
                    "chunk_index": chunk_index,
                }

                chunks.append(
                    Chunk(
                        text=page_text,
                        metadata=chunk_meta,
                        index=chunk_index,
                    )
                )

                chunk_index += 1
                continue

            # Large page → recursive split
            page_chunks = self._recursive_split(page_text)

            for text in page_chunks:
                if not text.strip():
                    continue

                chunk_meta = {
                    **base_meta,
                    **page.metadata,
                    "chunk_index": chunk_index,
                }

                chunks.append(
                    Chunk(
                        text=text.strip(),
                        metadata=chunk_meta,
                        index=chunk_index,
                    )
                )

                chunk_index += 1

        logger.info(
            "Split %d page(s) into %d chunk(s) (size=%d, overlap=%d)",
            len(pages),
            len(chunks),
            self.chunk_size,
            self.chunk_overlap,
        )

        # Debug preview
        for c in chunks[:3]:
            logger.info(
                "Chunk %s | Page %s | %s",
                c.index,
                c.metadata.get("page"),
                c.text[:120].replace("\n", " "),
            )

        return chunks

    def _recursive_split(
        self,
        text: str,
        depth: int = 0,
    ) -> list[str]:
        """Recursively split text using separator hierarchy."""

        if len(text) <= self.chunk_size:
            return [text]

        if depth >= len(self.separators):
            return self._hard_split(text)

        separator = self.separators[depth]
        parts = text.split(separator) if separator else list(text)

        result: list[str] = []
        current = ""

        for part in parts:
            candidate = (
                current + separator + part
                if current
                else part
            )

            if len(candidate) <= self.chunk_size:
                current = candidate

            else:
                if current:
                    result.append(current)

                if len(part) > self.chunk_size:
                    sub_chunks = self._recursive_split(
                        part,
                        depth + 1,
                    )

                    result.extend(sub_chunks[:-1])

                    current = (
                        sub_chunks[-1]
                        if sub_chunks
                        else ""
                    )
                else:
                    current = part

        if current:
            result.append(current)

        # Add overlap
        if self.chunk_overlap > 0 and len(result) > 1:
            overlapped: list[str] = [result[0]]

            for prev, curr in zip(result, result[1:]):
                overlap_text = (
                    prev[-self.chunk_overlap:]
                    if len(prev) >= self.chunk_overlap
                    else prev
                )

                overlapped.append(
                    overlap_text + curr
                )

            return overlapped

        return result

    def _hard_split(
        self,
        text: str,
    ) -> list[str]:
        """Character-level fallback split."""

        chunks: list[str] = []

        step = max(
            self.chunk_size - self.chunk_overlap,
            1,
        )

        for i in range(0, len(text), step):
            chunk = text[i : i + self.chunk_size]

            if chunk:
                chunks.append(chunk)

        return chunks