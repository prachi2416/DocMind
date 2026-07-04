import supabase from './db-client.js';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, conversation_id } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Try to forward the query to the FastAPI backend
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const fastApiRes = await fetch(`${FASTAPI_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), conversation_id }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = fastApiRes.headers.get('content-type') || '';

      // If FastAPI returns a streaming response (SSE)
      if (contentType.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = fastApiRes.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        } finally {
          reader.releaseLock();
          res.end();
        }
        return;
      }

      // If FastAPI returns a JSON response
      if (fastApiRes.ok) {
        const result = await fastApiRes.json();
        return res.status(200).json({
          answer: result.answer || '',
          sources: result.sources || [],
          backend: 'fastapi',
        });
      }

      // FastAPI returned an error
      const errorText = await fastApiRes.text();
      console.error('FastAPI query error:', fastApiRes.status, errorText);
      return res.status(502).json({
        error: `Backend returned status ${fastApiRes.status}`,
        backend_unavailable: false,
      });

    } catch (fetchErr) {
      // FastAPI is unreachable
      console.warn('FastAPI unreachable:', fetchErr.message);

      return res.status(503).json({
        error: 'RAG backend is not available. Please ensure Ollama and FastAPI are running.',
        backend_unavailable: true,
        detail: fetchErr.message,
      });
    }

  } catch (err) {
    console.error('Query API error:', err);
    res.status(500).json({ error: err.message });
  }
}
