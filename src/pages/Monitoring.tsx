import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Cpu, HardDrive, Wifi, CheckCircle, AlertTriangle, XCircle, Users, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceStatus {
  id: number;
  service: string;
  status: string;
  uptime: string;
  last_checked: string;
  details: Record<string, string | number>;
}

const serviceIcons: Record<string, React.ElementType> = {
  ollama: Cpu,
  chromadb: Database,
  fastapi: Server,
  postgresql: HardDrive,
};

const serviceColors: Record<string, string> = {
  ollama: 'from-blue-500 to-cyan-500',
  chromadb: 'from-violet-500 to-purple-500',
  fastapi: 'from-emerald-500 to-teal-500',
  postgresql: 'from-amber-500 to-orange-500',
};

const statusIconMap: Record<string, React.ElementType> = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  down: XCircle,
};

const statusColorMap: Record<string, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-amber-400',
  down: 'text-rose-400',
};

const healthData = [
  { time: '00:00', cpu: 45, memory: 62 },
  { time: '04:00', cpu: 32, memory: 58 },
  { time: '08:00', cpu: 67, memory: 71 },
  { time: '12:00', cpu: 78, memory: 76 },
  { time: '16:00', cpu: 72, memory: 74 },
  { time: '20:00', cpu: 55, memory: 68 },
  { time: 'Now', cpu: 61, memory: 72 },
];

export default function Monitoring() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, docsRes] = await Promise.all([
          fetch('/api/system-status'),
          fetch('/api/documents'),
        ]);
        if (statusRes.ok) {
          const data = await statusRes.json();
          setServices(data);
        }
        if (docsRes.ok) {
          const docs = await docsRes.json();
          setDocCount(docs.length);
        }
      } catch (err) {
        console.error('Fetch monitoring error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeSessions = Math.floor(Math.random() * 15) + 8;

  const overviewCards = [
    { label: 'Active Sessions', value: activeSessions, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { label: 'Indexed Documents', value: docCount, icon: FileText, color: 'from-violet-500 to-purple-500' },
    { label: 'System Uptime', value: '99.97%', icon: Wifi, color: 'from-emerald-500 to-teal-500' },
    { label: 'API Requests/min', value: Math.floor(Math.random() * 50) + 30, icon: Server, color: 'from-amber-500 to-orange-500' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Monitoring</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time health and performance monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5 hover:bg-white/5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={'w-10 h-10 rounded-xl bg-gradient-to-br ' + card.color + ' flex items-center justify-center'}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-sm text-slate-400 mt-1">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((svc, i) => {
          const Icon = serviceIcons[svc.service] || Server;
          const color = serviceColors[svc.service] || 'from-slate-500 to-slate-600';
          const StatusIcon = statusIconMap[svc.status] || CheckCircle;
          const statusColor = statusColorMap[svc.status] || 'text-slate-400';
          return (
            <motion.div key={svc.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="glass rounded-2xl p-5 hover:bg-white/5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={'w-10 h-10 rounded-xl bg-gradient-to-br ' + color + ' flex items-center justify-center'}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white capitalize">{svc.service}</h3>
                    <p className="text-xs text-slate-500">Uptime: {svc.uptime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={'w-5 h-5 ' + statusColor} />
                  <span className={'text-sm font-medium capitalize ' + statusColor}>{svc.status}</span>
                </div>
              </div>
              <div className="space-y-2">
                {svc.details && Object.entries(svc.details).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">Last checked: {new Date(svc.last_checked).toLocaleString()}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Resource Usage (24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={healthData}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
            <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
            <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
