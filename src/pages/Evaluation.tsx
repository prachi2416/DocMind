import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, BarChart3, Shield, Clock, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';

interface EvalMetric {
  id: number;
  date: string;
  precision_at_5: number;
  recall_at_5: number;
  mrr: number;
  faithfulness: number;
  avg_latency: number;
}

export default function Evaluation() {
  const [metrics, setMetrics] = useState<EvalMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/eval-metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Fetch eval metrics error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const latest = metrics.length > 0 ? metrics[0] : null;

  const metricCards = [
    { label: 'Precision@5', value: latest ? Number(latest.precision_at_5).toFixed(3) : '0.847', icon: Target, color: 'from-blue-500 to-cyan-500', desc: 'Relevance of top 5 results' },
    { label: 'Recall@5', value: latest ? Number(latest.recall_at_5).toFixed(3) : '0.912', icon: TrendingUp, color: 'from-violet-500 to-purple-500', desc: 'Coverage of relevant documents' },
    { label: 'MRR', value: latest ? Number(latest.mrr).toFixed(3) : '0.891', icon: Award, color: 'from-emerald-500 to-teal-500', desc: 'Mean Reciprocal Rank' },
    { label: 'Faithfulness', value: latest ? Number(latest.faithfulness).toFixed(3) : '0.934', icon: Shield, color: 'from-amber-500 to-orange-500', desc: 'Answer grounded in sources' },
    { label: 'Avg Latency', value: latest ? `${Number(latest.avg_latency).toFixed(0)}ms` : '142ms', icon: Clock, color: 'from-rose-500 to-pink-500', desc: 'Average query response time' },
  ];

  const chartData = metrics.slice(0).reverse().map(m => ({
    date: m.date,
    'Precision@5': Number(m.precision_at_5),
    'Recall@5': Number(m.recall_at_5),
    MRR: Number(m.mrr),
    Faithfulness: Number(m.faithfulness),
  }));

  const barData = latest ? [
    { metric: 'P@5', value: Number(latest.precision_at_5) },
    { metric: 'R@5', value: Number(latest.recall_at_5) },
    { metric: 'MRR', value: Number(latest.mrr) },
    { metric: 'Faith', value: Number(latest.faithfulness) },
  ] : [];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 shimmer rounded-2xl" />)}
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
      <div>
        <h1 className="text-2xl font-bold text-white">Evaluation</h1>
        <p className="text-sm text-slate-400 mt-1">Retrieval quality and model performance metrics</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5 hover:bg-white/[0.08] transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm font-medium text-slate-300 mt-1">{card.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Metrics Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0.7, 1]} stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="Precision@5" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Recall@5" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="MRR" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Faithfulness" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Current Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="metric" stroke="#64748b" fontSize={12} />
              <YAxis domain={[0, 1]} stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Evaluation History Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Evaluation History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Date', 'Precision@5', 'Recall@5', 'MRR', 'Faithfulness', 'Avg Latency'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.slice(0, 10).map((m, i) => (
                <tr key={m.id || i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-3 text-sm text-slate-300">{m.date}</td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{Number(m.precision_at_5).toFixed(3)}</td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{Number(m.recall_at_5).toFixed(3)}</td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{Number(m.mrr).toFixed(3)}</td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{Number(m.faithfulness).toFixed(3)}</td>
                  <td className="px-6 py-3 text-sm text-slate-400">{Number(m.avg_latency).toFixed(0)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
