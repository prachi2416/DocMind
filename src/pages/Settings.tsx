import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sliders, Palette, Key, Save, RotateCcw } from 'lucide-react';

const models = [
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B', desc: 'Fast, efficient for most queries' },
  { id: 'llama3.1:70b', name: 'Llama 3.1 70B', desc: 'High accuracy, requires more resources' },
  { id: 'mistral:7b', name: 'Mistral 7B', desc: 'Good balance of speed and quality' },
  { id: 'codellama:13b', name: 'Code Llama 13B', desc: 'Optimized for code-related queries' },
  { id: 'mixtral:8x7b', name: 'Mixtral 8x7B', desc: 'Mixture of experts, strong performance' },
];

export default function Settings() {
  const [settings, setSettings] = useState({
    model: 'llama3.1:8b',
    topK: 5,
    chunkSize: 512,
    chunkOverlap: 50,
    temperature: 0.7,
    theme: 'dark',
    apiEndpoint: 'http://localhost:8000',
    ollamaUrl: 'http://localhost:11434',
    chromaUrl: 'http://localhost:8001',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({
      model: 'llama3.1:8b',
      topK: 5,
      chunkSize: 512,
      chunkOverlap: 50,
      temperature: 0.7,
      theme: 'dark',
      apiEndpoint: 'http://localhost:8000',
      ollamaUrl: 'http://localhost:11434',
      chromaUrl: 'http://localhost:8001',
    });
  };

  const update = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your DocMind instance</p>
      </div>

      {/* Model Selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Model Selection</h3>
            <p className="text-xs text-slate-400">Choose the Ollama model for generation</p>
          </div>
        </div>
        <div className="space-y-3">
          {models.map(m => (
            <button
              key={m.id}
              onClick={() => update('model', m.id)}
              className={'w-full flex items-center justify-between p-4 rounded-xl border transition-all ' + (settings.model === m.id ? 'bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10')}
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-slate-400">{m.desc}</p>
              </div>
              <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center ' + (settings.model === m.id ? 'border-blue-500' : 'border-white/20')}>
                {settings.model === m.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Retrieval Config */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Retrieval Configuration</h3>
            <p className="text-xs text-slate-400">Fine-tune document retrieval parameters</p>
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">Top-K Results</label>
              <span className="text-sm font-mono text-blue-400">{settings.topK}</span>
            </div>
            <input type="range" min="1" max="20" value={settings.topK} onChange={(e) => update('topK', parseInt(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1</span><span>20</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">Chunk Size</label>
              <span className="text-sm font-mono text-blue-400">{settings.chunkSize}</span>
            </div>
            <input type="range" min="128" max="2048" step="128" value={settings.chunkSize} onChange={(e) => update('chunkSize', parseInt(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>128</span><span>2048</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">Chunk Overlap</label>
              <span className="text-sm font-mono text-blue-400">{settings.chunkOverlap}</span>
            </div>
            <input type="range" min="0" max="200" step="10" value={settings.chunkOverlap} onChange={(e) => update('chunkOverlap', parseInt(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0</span><span>200</span></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">Temperature</label>
              <span className="text-sm font-mono text-blue-400">{settings.temperature.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={(e) => update('temperature', parseFloat(e.target.value))} className="w-full accent-blue-500" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0.0</span><span>2.0</span></div>
          </div>
        </div>
      </motion.div>

      {/* Theme */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Theme Settings</h3>
            <p className="text-xs text-slate-400">Customize the interface appearance</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['dark', 'midnight', 'slate'].map(t => (
            <button
              key={t}
              onClick={() => update('theme', t)}
              className={'p-4 rounded-xl border capitalize transition-all ' + (settings.theme === t ? 'bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/30 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10')}
            >
              <div className={'w-full h-8 rounded-lg mb-2 ' + (t === 'dark' ? 'bg-slate-950' : t === 'midnight' ? 'bg-indigo-950' : 'bg-slate-800')} />
              <p className="text-sm font-medium">{t}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* API Configuration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">API Configuration</h3>
            <p className="text-xs text-slate-400">Configure service endpoints</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">FastAPI Endpoint</label>
            <input type="text" value={settings.apiEndpoint} onChange={(e) => update('apiEndpoint', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Ollama URL</label>
            <input type="text" value={settings.ollamaUrl} onChange={(e) => update('ollamaUrl', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">ChromaDB URL</label>
            <input type="text" value={settings.chromaUrl} onChange={(e) => update('chromaUrl', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      </motion.div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={handleReset} className="px-5 py-2.5 rounded-xl glass text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button onClick={handleSave} className={'px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ' + (saved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:shadow-lg hover:shadow-blue-500/25')}>
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
