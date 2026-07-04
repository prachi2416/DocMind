import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Shield, Zap, FileSearch, Activity, Package,
  ArrowRight, ChevronRight, Github, Twitter, Linkedin
} from 'lucide-react';

const features = [
  { icon: Brain, title: 'Local-First AI', desc: 'Run entirely on-premise with Ollama and Llama 3.1. Zero data leaves your infrastructure.', color: 'from-blue-500 to-cyan-500' },
  { icon: FileSearch, title: 'Smart Retrieval', desc: 'ChromaDB-powered vector search with sentence-transformer embeddings for precise document retrieval.', color: 'from-violet-500 to-purple-500' },
  { icon: Shield, title: 'Source Citations', desc: 'Every AI response is backed by verifiable source citations with relevance scores and page references.', color: 'from-emerald-500 to-teal-500' },
  { icon: Zap, title: 'Enterprise Security', desc: 'SOC 2 compliant architecture with zero data leakage. Your documents never leave your network.', color: 'from-amber-500 to-orange-500' },
  { icon: Activity, title: 'Real-time Monitoring', desc: 'Track system health, query latency, and retrieval quality with comprehensive dashboards.', color: 'from-rose-500 to-pink-500' },
  { icon: Package, title: 'Easy Deployment', desc: 'Docker Compose setup with FastAPI backend. Deploy in minutes with full Kubernetes support.', color: 'from-indigo-500 to-blue-500' },
];

const archSteps = [
  { label: 'Upload', sub: 'PDF, MD, DOCX', icon: '📄' },
  { label: 'Chunking', sub: 'Smart Split', icon: '✂️' },
  { label: 'Embeddings', sub: 'Sentence TF', icon: '🧮' },
  { label: 'ChromaDB', sub: 'Vector Store', icon: '💾' },
  { label: 'Retrieval', sub: 'Top-K Search', icon: '🔍' },
  { label: 'Ollama', sub: 'Llama 3.1', icon: '🦙' },
  { label: 'Response', sub: 'Cited Answer', icon: '✅' },
];

const stats = [
  { value: '10M+', label: 'Documents Processed' },
  { value: '500K+', label: 'Queries Answered' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '~200ms', label: 'Avg Latency' },
];

const techStack = ['Ollama', 'Llama 3.1', 'ChromaDB', 'LangChain', 'Sentence Transformers', 'FastAPI', 'PostgreSQL', 'Docker', 'React', 'TypeScript'];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className={'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ' + (scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/10' : '')}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">DocMind</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="text-sm text-slate-400 hover:text-white transition-colors">Architecture</a>
            <a href="#stats" className="text-sm text-slate-400 hover:text-white transition-colors">Performance</a>
            <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
              Get Started
            </button>
          </div>
          <button onClick={() => navigate('/login')} className="md:hidden px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden animated-gradient">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-slate-300">Enterprise-Grade Local RAG Platform</span>
            </div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">AI That </span>
            <span className="gradient-text">Understands</span>
            <br />
            <span className="text-white">Your Documents</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Privacy-first Retrieval-Augmented Generation powered by Ollama, ChromaDB, and LangChain. Run entirely on-premise with full source citations.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')} className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/architecture')} className="px-8 py-3.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
              View Architecture
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }} className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {['99.9% Uptime', 'Under 200ms Latency', '100% Private'].map((text, i) => (
              <div key={i} className="glass rounded-2xl px-6 py-4 text-center animate-float" style={{ animationDelay: String(i * 0.5) + 's' }}>
                <p className="text-sm font-medium text-white">{text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built for Enterprise</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Every feature designed for production-grade document intelligence at scale.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 group">
                  <div className={'w-12 h-12 rounded-xl bg-gradient-to-br ' + f.color + ' flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How DocMind Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">From document upload to cited AI response — a complete RAG pipeline.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-0">
            {archSteps.map((step, i) => (
              <div key={i} className="flex items-center">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-strong rounded-2xl px-5 py-4 text-center min-w-28">
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.sub}</p>
                </motion.div>
                {i < archSteps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-slate-600 mx-1 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">{s.value}</p>
              <p className="text-sm text-slate-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-6 bg-slate-900/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Powered By Industry Leaders</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, i) => (
              <span key={i} className="px-5 py-2.5 rounded-full glass text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-default">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Deploy DocMind?</h2>
          <p className="text-slate-400 mb-8">Get started in minutes with Docker Compose. No cloud dependency, no data leakage.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')} className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/architecture')} className="px-8 py-3.5 rounded-xl border border-white/20 text-white font-medium hover:bg-white/5 transition-all">
              View Documentation
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">DocMind</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span>Documentation</span>
            <span>API Reference</span>
            <span>Support</span>
            <span>Status</span>
          </div>
          <div className="flex items-center gap-4">
            <Github className="w-5 h-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
            <Twitter className="w-5 h-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
            <Linkedin className="w-5 h-5 text-slate-500 hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-600">2024 DocMind. Enterprise RAG Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
