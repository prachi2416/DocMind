"""Ollama LLM client — generates grounded answers from context.

Supports both synchronous (full response) and streaming (SSE)
generation via the Ollama REST API.
"""

from __future__ import annotations

import os
import json
import logging
from typing import AsyncIterator

import httpx

logger = logging.getLogger("docmind.llm")

RAG_SYSTEM_PROMPT = """\
You are DocMind, an intelligent document assistant.

Answer questions using ONLY the provided document context.

Instructions:
- Give a direct answer first.
- Explain concepts in simple language.
- Use headings and bullet points when helpful.
- Provide examples if the user asks for them.
- Summarize instead of copying large chunks from the document.
- If information is missing from the context, clearly say so.
- Do NOT repeat the source document name throughout the answer.
- Do NOT write things like "According to the context" or "The document states".
- Do NOT paste raw document text.
- Format responses in clean Markdown.

Response Style:

## Short Answer
(1-3 sentence answer)

## Key Points
- Point 1
- Point 2
- Point 3

## Example
(Only if relevant)

Keep answers professional, concise, and easy to read.
"""


class OllamaClient:
    """Client for the Ollama LLM inference server.

    Args:
        model: Ollama model tag (e.g. 'llama3.1:8b').
        base_url: Ollama API base URL.
        temperature: Sampling temperature (0 = deterministic, 2 = creative).
        max_tokens: Maximum tokens in the generated response.
    """

    def __init__(
        self,
        model: str | None = None,
        base_url: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> None:
        self.model = model or os.getenv("OLLAMA_MODEL", "llama3.2:3b")
        self.base_url = (base_url or os.getenv("OLLAMA_URL", "http://localhost:11434")).rstrip("/")
        self.temperature = temperature
        self.max_tokens = max_tokens

    def _build_prompt(self, question: str, context: str) -> str:
         """Construct the RAG prompt."""

         return f"""
DOCUMENT CONTEXT:

{context}

--------------------------------------------------

USER QUESTION:
{question}

Instructions:
- Answer using ONLY the document context.
- Do not make up information.
- Explain concepts in simple language.
- Use bullet points when useful.
- Give examples if the user asks for them.
- Summarize instead of copying large chunks.
- If the answer is not present in the context, clearly say so.

ANSWER:
"""

    async def generate(self, question: str, context: str) -> str:
        """Generate a complete answer (non-streaming).

        Args:
            question: User's natural-language question.
            context: Retrieved document chunks as context.

        Returns:
            The generated answer string.

        Raises:
            ConnectionError: If Ollama is unreachable.
            RuntimeError: If generation fails.
        """
        prompt = self._build_prompt(question, context)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": RAG_SYSTEM_PROMPT,
            "stream": False,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        logger.info("Generating answer with %s (prompt: %d chars)", self.model, len(prompt))

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                answer = data.get("response", "")
        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"Cannot connect to Ollama at {self.base_url}. "
                f"Ensure Ollama is running: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Ollama returned HTTP {exc.response.status_code}: {exc.response.text[:500]}"
            ) from exc

        logger.info("Generated answer: %d chars", len(answer))
        return answer.strip()

    async def stream(self, question: str, context: str) -> AsyncIterator[str]:
        """Stream the answer token-by-token.

        Args:
            question: User's natural-language question.
            context: Retrieved document chunks as context.

        Yields:
            Individual text tokens as they are generated.

        Raises:
            ConnectionError: If Ollama is unreachable.
            RuntimeError: If streaming fails.
        """
        prompt = self._build_prompt(question, context)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": RAG_SYSTEM_PROMPT,
            "stream": True,
            "options": {
                "temperature": self.temperature,
                "num_predict": self.max_tokens,
            },
        }

        logger.info("Streaming answer with %s (prompt: %d chars)", self.model, len(prompt))

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as resp:
                    resp.raise_for_status()

                    async for line in resp.aiter_lines():
                        if not line.strip():
                            continue

                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        token = chunk.get("response", "")
                        if token:
                            yield token

                        if chunk.get("done", False):
                            break

        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"Cannot connect to Ollama at {self.base_url}: {exc}"
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"Ollama streaming error HTTP {exc.response.status_code}"
            ) from exc
