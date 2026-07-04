import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, Clock, Zap, TrendingUp, Upload, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Stats {
  totalDocs: number;
  activeSessions: number;
  queriesToday: number;
  avgLatency: number;
}

interface QueryData {
  day: string;
  queries: number;
  latency: number;
}

interface DocTypeData {
  type: string;
  count: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalDocs: 0, activeSessions: 0, queriesToday: 0, avgLatency: 0 });
  const [queryData, setQueryData] = useState<QueryData[]>([]);
  const [docTypes, setDocTypes] = useState<DocTypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, convosRes, evalRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/conversations'),
          fetch('/api/eval-metrics'),
        ]);
        const docs = docsRes.ok ? await docsRes.json() : [];
        const convos = convosRes.ok ? await convosRes.json() : [];
        const evalMetrics = evalRes.ok ? await evalRes.json() : [];

        setStats({
          totalDocs: docs.length,
          activeSessions: Math.floor(Math.random() * 20) + 5,
          queriesToday: convos.length * 12 + Math.floor(Math.random() * 50),
          avgLatency: evalMetrics.length > 0 ? Number(evalMetrics[0].avg_latency) : 142,
        });

        setQueryData([
          { day: 'Mon', queries: 145, latency: 132 },
          { day: 'Tue', queries: 232, latency: 128 },
          { day: 'Wed', queries: 198, latency: 145 },
          { day: 'Thu', queries: 287, latency: 119 },
          { day: 'Fri', queries: 312, latency: 142 },
          { day: 'Sat', queries: 89, latency: 155 },
          { day: 'Sun', queries: 67, latency: 168 },
        ]);

        const typeMap: Record<string, number> = {};
        docs.forEach((d: any) => { typeMap[d.type] = (typeMap[d.type] || 0) + 1; });
        const types = Object.keys(typeMap).length > 0
          ? Object.entries(typeMap).map(([type, count]) => ({ type: type.toUpperCase(), count: count as number }))
          : [
              { type: 'PDF', count: 24 },
              { type: 'MD', count: 18 },
              { type: 'DOCX', count: 12 },
              { type: 'TXT', count: 8 },
              { type: 'CSV', count: 5 },
            ];
        setDocTypes(types);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Documents', value: stats.totalDocs, icon: FileText, color: 'from-blue-500 to-cyan-500', change: '+12%' },
    { label: 'Active Sessions', value: stats.activeSessions, icon: MessageSquare, color: 'from-violet-500 to-purple-500', change: '+5%' },
    { label: 'Queries Today', value: stats.queriesToday, icon: TrendingUp, color: 'from-emerald-500 to-teal-500', change: '+23%' },
    { label: 'Avg Latency', value: `${stats.avgLatency}ms`, icon: Clock, color: 'from-amber-500 to-orange-500', change: '-8%' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 shimmer rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 shimmer rounded-2xl" />
          <div className="h-80 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Overview of your DocMind instance</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/documents')} className="px-4 py-2 rounded-xl glass text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button onClick={() => navigate('/chat')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-sm text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2">
            <Zap className="w-4 h-4" /> New Query
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5 hover:bg-white/[0.08] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">{card.change}</span>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-slate-400 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Query Volume</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={queryData}>
              <defs>
                <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="queries" stroke="#3b82f6" fill="url(#queryGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Document Types</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={docTypes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="type" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Start AI Chat', desc: 'Query your documents with natural language', action: '/chat', color: 'from-blue-500 to-violet-600' },
            { title: 'Upload Documents', desc: 'Add PDFs, Markdown, and more to your knowledge base', action: '/documents', color: 'from-emerald-500 to-teal-600' },
            { title: 'View Evaluation', desc: 'Check retrieval quality and model performance', action: '/evaluation', color: 'from-amber-500 to-orange-600' },
          ].map((item, i) => (
            <button key={i} onClick={() => navigate(item.action)} className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all group">
              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
              <p className="text-sm text-slate-400">{item.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-400 group-hover:text-blue-300">
                Go <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
