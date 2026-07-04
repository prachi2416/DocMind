"""Document loader — extracts text from PDF, DOCX, TXT, and Markdown.

Returns a list of Page objects, one per page (or the whole document
for non-paginated formats).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger("docmind.loader")


@dataclass
class Page:
    """A single page (or logical section) of a document."""
    page_number: int
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentLoader:
    """Load documents from various file formats."""

    async def load(self, path: Path, ext: str) -> list[Page]:
        """Load a document and return its pages.

        Args:
            path: Filesystem path to the document.
            ext: File extension (pdf, docx, txt, md).

        Returns:
            List of Page objects with extracted text.

        Raises:
            ValueError: If the file format is unsupported.
            RuntimeError: If text extraction fails.
        """
        loaders: dict[str, Any] = {
            "pdf": self._load_pdf,
            "docx": self._load_docx,
            "txt": self._load_text,
            "md": self._load_text,
            "markdown": self._load_text,
        }

        loader = loaders.get(ext)
        if not loader:
            raise ValueError(f"Unsupported file format: .{ext}")

        logger.info("Loading '%s' as %s", path.name, ext.upper())

        try:
            pages = await loader(path)
        except Exception as exc:
            logger.exception("Failed to load '%s'", path.name)
            raise RuntimeError(f"Failed to load {path.name}: {exc}") from exc

        logger.info("Loaded %d page(s) from '%s'", len(pages), path.name)
        return pages

    async def _load_pdf(self, path: Path) -> list[Page]:
        """Extract text from PDF using PyMuPDF (fitz)."""
        try:
            import fitz  # PyMuPDF
        except ImportError:
            return await self._load_pdf_plumber(path)

        pages: list[Page] = []
        doc = fitz.open(str(path))
        try:
            for i, page in enumerate(doc):
                text = page.get_text("text").strip()
                if text:
                    pages.append(Page(
                        page_number=i + 1,
                        text=text,
                        metadata={"page": i + 1, "source": str(path)},
                    ))
        finally:
            doc.close()
        return pages

    async def _load_pdf_plumber(self, path: Path) -> list[Page]:
        """Fallback PDF loader using pdfplumber."""
        import pdfplumber

        pages: list[Page] = []
        with pdfplumber.open(str(path)) as pdf:
            for i, page in enumerate(pdf.pages):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append(Page(
                        page_number=i + 1,
                        text=text,
                        metadata={"page": i + 1, "source": str(path)},
                    ))
        return pages

    async def _load_docx(self, path: Path) -> list[Page]:
        """Extract text from DOCX using python-docx."""
        from docx import Document as DocxDocument

        doc = DocxDocument(str(path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs)

        if not full_text.strip():
            return []

        return [Page(
            page_number=1,
            text=full_text,
            metadata={"page": 1, "source": str(path)},
        )]

    async def _load_text(self, path: Path) -> list[Page]:
        """Read plain text or Markdown file."""
        encodings = ["utf-8", "utf-8-sig", "latin-1"]

        for enc in encodings:
            try:
                text = path.read_text(encoding=enc)
                if text.strip():
                    return [Page(
                        page_number=1,
                        text=text.strip(),
                        metadata={"page": 1, "source": str(path)},
                    )]
            except (UnicodeDecodeError, UnicodeError):
                continue

        return []
