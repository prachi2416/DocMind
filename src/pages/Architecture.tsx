import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, Database, Cpu, Search, Sparkles, FileText, Scissors } from 'lucide-react';

const pipeline = [
  { step: 1, label: 'Document Upload', sub: 'PDF, Markdown, DOCX, TXT', icon: FileText, color: 'from-blue-500 to-cyan-500', desc: 'Users upload documents through the web interface or REST API. Files are validated, stored, and queued for processing.' },
  { step: 2, label: 'Smart Chunking', sub: 'LangChain TextSplitters', icon: Scissors, color: 'from-cyan-500 to-teal-500', desc: 'Documents are split into semantically meaningful chunks using recursive character text splitting with configurable chunk size and overlap.' },
  { step: 3, label: 'Embedding Generation', sub: 'Sentence Transformers', icon: Brain, color: 'from-teal-500 to-emerald-500', desc: 'Each chunk is converted into a dense vector embedding using all-MiniLM-L6-v2 sentence transformer model (384-dimensional vectors).' },
  { step: 4, label: 'Vector Storage', sub: 'ChromaDB', icon: Database, color: 'from-emerald-500 to-lime-500', desc: 'Embeddings and metadata are stored in ChromaDB, a fast open-source vector database optimized for similarity search.' },
  { step: 5, label: 'Semantic Retrieval', sub: 'Top-K Similarity Search', icon: Search, color: 'from-lime-500 to-amber-500', desc: 'User queries are embedded and used to retrieve the top-K most similar document chunks from ChromaDB using cosine similarity.' },
  { step: 6, label: 'LLM Generation', sub: 'Ollama + Llama 3.1', icon: Cpu, color: 'from-amber-500 to-orange-500', desc: 'Retrieved chunks are injected into the LLM prompt as context. Ollama runs Llama 3.1 locally to generate grounded responses.' },
  { step: 7, label: 'Cited Response', sub: 'Source Attribution', icon: Sparkles, color: 'from-orange-500 to-rose-500', desc: 'The final response includes source citations with document names, page numbers, excerpts, and relevance scores for full traceability.' },
];

const techStack = [
  { category: 'AI & ML', items: [
    { name: 'Ollama', desc: 'Local LLM runtime' },
    { name: 'Llama 3.1', desc: 'Foundation model' },
    { name: 'LangChain', desc: 'RAG orchestration' },
    { name: 'Sentence Transformers', desc: 'Embedding model' },
  ]},
  { category: 'Data & Storage', items: [
    { name: 'ChromaDB', desc: 'Vector database' },
    { name: 'PostgreSQL', desc: 'Analytics & metadata' },
    { name: 'Redis', desc: 'Caching layer' },
  ]},
  { category: 'Backend', items: [
    { name: 'FastAPI', desc: 'REST API server' },
    { name: 'Python 3.11', desc: 'Runtime' },
    { name: 'Docker', desc: 'Containerization' },
  ]},
  { category: 'Frontend', items: [
    { name: 'React 18', desc: 'UI framework' },
    { name: 'TypeScript', desc: 'Type safety' },
    { name: 'Tailwind CSS', desc: 'Styling' },
  ]},
];

export default function Architecture() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">DocMind</span>
          </div>
          <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium">
            Get Started
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">System Architecture</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A complete walkthrough of DocMind's Retrieval-Augmented Generation pipeline — from document upload to cited AI response.
          </p>
        </motion.div>

        {/* Pipeline Flow Visual */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {pipeline.map((step, i) => (
              <div key={step.step} className="flex items-center">
                <div className={`glass-strong rounded-2xl px-4 py-3 text-center min-w-[100px]`}>
                  <step.icon className={`w-6 h-6 mx-auto mb-1`} style={{ color: ['#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#f43f5e'][i] }} />
                  <p className="text-xs font-semibold text-white">{step.label}</p>
                </div>
                {i < pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 mx-1 hidden md:block" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pipeline Details */}
        <div className="space-y-6 mb-20">
          {pipeline.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6 hover:bg-white/[0.08] transition-all"
            >
              <div className="flex items-start gap-5">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-500">STEP {step.step}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-white">{step.label}</h3>
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">{step.sub}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((cat, i) => (
              <div key={i} className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{cat.category}</h3>
                <div className="space-y-3">
                  {cat.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Docker Compose */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl p-6 mb-20">
          <h2 className="text-xl font-bold text-white mb-4">Quick Start with Docker Compose</h2>
          <div className="bg-black/40 rounded-xl p-5 font-mono text-sm overflow-x-auto">
            <pre className="text-slate-300">{`version: '3.8'
services:
  docmind-api:
    build: ./api
    ports: ["8000:8000"]
    environment:
      - OLLAMA_URL=http://ollama:11434
      - CHROMA_URL=http://chromadb:8001
      - DATABASE_URL=postgresql://...
    depends_on: [ollama, chromadb, postgres]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama_data:/root/.ollama"]

  chromadb:
    image: chromadb/chroma:latest
    ports: ["8001:8000"]
    volumes: ["chroma_data:/chroma/chroma"]

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: docmind
      POSTGRES_PASSWORD: secret
    volumes: ["pg_data:/var/lib/postgresql/data"]

volumes:
  ollama_data:
  chroma_data:
  pg_data:`}</pre>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Build?</h2>
          <p className="text-slate-400 mb-6">Start using DocMind in minutes with Docker Compose.</p>
          <button onClick={() => navigate('/login')} className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
            Get Started Free
          </button>
        </div>
      </div>
    </div>
  );
}
