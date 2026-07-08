import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Search, FileText, File, FileSpreadsheet, FileCode,
  CheckCircle, Clock, AlertCircle, Trash2, Loader2, X,
  ArrowRight, Zap, Scissors, Brain, Database
} from 'lucide-react';
import supabase from "../lib/supabase";

interface Document {
  id: number;
  name: string;
  type: string;
  size: number;
  status: string;
  chunks: number;
  indexed_at: string;
  uploaded_at: string;
}

interface UploadItem {
  id: string;
  file: File;
  stage: 'uploading' | 'uploaded' | 'processing' | 'chunking' | 'embedding' | 'indexed' | 'failed';
  progress: number;
  chunks: number;
  error: string | null;
  documentId: number | null;
}

const typeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  md: FileCode,
  docx: File,
  txt: File,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
};

const stageConfig: Record<string, { color: string; icon: React.ElementType; label: string; desc: string }> = {
  uploading:   { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   icon: Upload,   label: 'Uploading',       desc: 'Sending file to server...' },
  uploaded:    { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   icon: CheckCircle, label: 'Uploaded',     desc: 'File received by server' },
  processing:  { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Loader2, label: 'Processing',     desc: 'Parsing document content...' },
  chunking:    { color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Scissors, label: 'Chunking',    desc: 'Splitting into semantic chunks...' },
  embedding:   { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',  icon: Brain,    label: 'Embedding',      desc: 'Generating vector embeddings...' },
  indexed:     { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Database, label: 'Indexed', desc: 'Stored in vector database' },
  failed:      { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',  icon: AlertCircle, label: 'Failed',      desc: 'Processing failed' },
  pending:     { color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock,    label: 'Pending',       desc: 'Waiting to process...' },
};

const stageOrder = ['uploading', 'uploaded', 'processing', 'chunking', 'embedding', 'indexed'];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getStageProgress(stage: string): number {
  const idx = stageOrder.indexOf(stage);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / stageOrder.length) * 100);
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

const fetchDocuments = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (error) throw error;

    setDocuments(data || []);
  } catch (err) {
    console.error("Fetch documents error:", err);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const updateUploadItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

const processFile = useCallback(
  async (item: UploadItem) => {
    const { id, file } = item;

    try {
      updateUploadItem(id, {
        stage: "uploading",
        progress: 10,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Please login first");

      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      updateUploadItem(id, {
        stage: "uploaded",
        progress: 40,
      });

      const { data: publicData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          name: file.name,
          type: file.name.split(".").pop()?.toLowerCase(),
          size: file.size,
          status: "indexed",
          chunks: 0,
          file_path: filePath,
          file_url: publicData.publicUrl,
        })
        .select()
        .single();

      if (docError) throw docError;

      updateUploadItem(id, {
        stage: "indexed",
        progress: 100,
        documentId: docData.id,
      });

      fetchDocuments();
    } catch (err: any) {
      console.error(err);

      updateUploadItem(id, {
        stage: "failed",
        error: err.message,
      });
    }
  },
  [fetchDocuments, updateUploadItem],
);

  const pollDocumentStatus = useCallback(async (documentId: number, uploadId: string) => {
    const maxPolls = 120; // 2 minutes max
    let pollCount = 0;
    let lastStage = '';

    while (pollCount < maxPolls) {
      try {
        const res = await fetch(`/api/documents-status?id=${documentId}`);
        if (!res.ok) throw new Error('Status check failed');
        const data = await res.json();

        const currentStage = data.status || 'processing';

        // Only update if stage changed
        if (currentStage !== lastStage) {
          lastStage = currentStage;

          if (currentStage === 'indexed') {
            updateUploadItem(uploadId, {
              stage: 'indexed',
              chunks: data.chunks || 0,
              progress: 100,
            });
            fetchDocuments();
            return;
          }

          if (currentStage === 'failed') {
            updateUploadItem(uploadId, {
              stage: 'failed',
              error: data.error || 'Processing failed',
            });
            fetchDocuments();
            return;
          }

          // Map backend status to our UI stages
          const stageMap: Record<string, string> = {
            uploaded: 'uploaded',
            processing: 'processing',
            chunking: 'chunking',
            embedding: 'embedding',
            indexed: 'indexed',
            failed: 'failed',
          };

          const uiStage = stageMap[currentStage] || 'processing';
          updateUploadItem(uploadId, {
            stage: uiStage as any,
            chunks: data.chunks || 0,
            progress: getStageProgress(uiStage),
          });
        }

      } catch (err) {
        console.error('Poll error:', err);
      }

      pollCount++;
      await delay(1000);
    }

    // Timeout
    updateUploadItem(uploadId, { stage: 'failed', error: 'Processing timed out' });
  }, [updateUploadItem, fetchDocuments]);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      stage: 'uploading' as const,
      progress: 0,
      chunks: 0,
      error: null,
      documentId: null,
    }));

    setUploadQueue(prev => [...newItems, ...prev]);

    // Process each file sequentially
    for (const item of newItems) {
      await processFile(item);
    }
  }, [processFile]);

  const removeUploadItem = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const deleteDocument = useCallback(async (id: number) => {
    try {
      await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, []);

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || d.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const activeUploads = uploadQueue.filter(u => !['indexed', 'failed'].includes(u.stage));

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-40 shimmer rounded-2xl" />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 shimmer rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your knowledge base</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{documents.length} documents</span>
          <span className="text-sm text-emerald-400">{documents.filter(d => d.status === 'indexed').length} indexed</span>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={'relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ' + (dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]')}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.md,.docx,.txt,.csv,.xlsx"
          onChange={(e) => { handleUpload(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
        />
        <Upload className={'w-10 h-10 mx-auto mb-3 ' + (dragActive ? 'text-blue-400' : 'text-slate-500')} />
        <p className="text-sm text-slate-300 mb-1">
          {activeUploads.length > 0 ? `${activeUploads.length} file${activeUploads.length > 1 ? 's' : ''} processing...` : 'Drag & drop files here, or'}
        </p>
        {activeUploads.length === 0 && (
          <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer underline bg-transparent border-none">
            browse to upload
          </button>
        )}
        <p className="text-xs text-slate-500 mt-2">Supports PDF, Markdown, DOCX, TXT, CSV, XLSX</p>
      </div>

      {/* Active Uploads / Processing Queue */}
      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Processing Queue</h3>
              {uploadQueue.every(u => ['indexed', 'failed'].includes(u.stage)) && (
                <button
                  onClick={() => setUploadQueue([])}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear completed
                </button>
              )}
            </div>
            {uploadQueue.map((item) => {
              const stage = stageConfig[item.stage] || stageConfig.pending;
              const StageIcon = stage.icon;
              const isComplete = item.stage === 'indexed' || item.stage === 'failed';
              const overallProgress = item.stage === 'uploading'
                ? Math.round(item.progress * (100 / stageOrder.length) / 100)
                : getStageProgress(item.stage);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* File icon */}
                    <div className={'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ' + (item.stage === 'indexed' ? 'bg-emerald-500/20' : item.stage === 'failed' ? 'bg-rose-500/20' : 'bg-blue-500/20')}>
                      {item.stage === 'uploading' || item.stage === 'processing' || item.stage === 'chunking' || item.stage === 'embedding' ? (
                        <StageIcon className={'w-5 h-5 ' + stage.color.split(' ')[0] + (item.stage === 'processing' || item.stage === 'chunking' || item.stage === 'embedding' ? ' animate-spin' : '')} />
                      ) : (
                        <StageIcon className={'w-5 h-5 ' + stage.color.split(' ')[0]} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate pr-4">{item.file.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={'text-xs font-medium px-2.5 py-0.5 rounded-full border ' + stage.color}>
                            {stage.label}
                          </span>
                          {isComplete && (
                            <button onClick={() => removeUploadItem(item.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                              <X className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stage description */}
                      <p className="text-xs text-slate-500 mb-2">
                        {item.stage === 'failed' ? (item.error || 'Processing failed') : stage.desc}
                      </p>

                      {/* Progress bar */}
                      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={'absolute inset-y-0 left-0 rounded-full ' + (
                            item.stage === 'indexed' ? 'bg-emerald-500' :
                            item.stage === 'failed' ? 'bg-rose-500' :
                            'bg-gradient-to-r from-blue-500 to-violet-500'
                          )}
                          initial={false}
                          animate={{ width: overallProgress + '%' }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      </div>

                      {/* Stage pipeline visualization */}
                      <div className="flex items-center gap-1 mt-2.5">
                        {stageOrder.map((s, i) => {
                          const sConfig = stageConfig[s];
                          const currentIdx = stageOrder.indexOf(item.stage);
                          const isReached = i <= currentIdx && currentIdx >= 0;
                          const isCurrent = s === item.stage;
                          const isFailed = item.stage === 'failed' && s === 'processing';

                          return (
                            <div key={s} className="flex items-center">
                              <div className={'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ' + (
                                isFailed ? 'text-rose-400 bg-rose-500/10' :
                                isCurrent && item.stage !== 'indexed' ? 'text-white bg-white/10' :
                                isReached || (item.stage === 'indexed') ? 'text-emerald-400 bg-emerald-500/10' :
                                'text-slate-600 bg-transparent'
                              )}>
                                {isReached && !isCurrent && item.stage !== 'failed' ? (
                                  <CheckCircle className="w-2.5 h-2.5" />
                                ) : isCurrent && item.stage !== 'indexed' ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : null}
                                {sConfig.label}
                              </div>
                              {i < stageOrder.length - 1 && (
                                <ArrowRight className="w-3 h-3 text-slate-700 mx-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Chunks count when indexed */}
                      {item.stage === 'indexed' && item.chunks > 0 && (
                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
                          <Database className="w-3 h-3" />
                          {item.chunks} chunks indexed in vector database
                        </p>
                      )}
                    </div>

                    {/* Size */}
                    <span className="text-xs text-slate-500 shrink-0 mt-1">{formatSize(item.file.size)}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'indexed', 'processing', 'chunking', 'embedding', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ' + (
                filter === f
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/10 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Chunks</div>
          <div className="col-span-1">Size</div>
          <div className="col-span-1"></div>
        </div>
        <AnimatePresence>
          {filteredDocs.map((doc) => {
            const Icon = typeIcons[doc.type] || File;
            const status = stageConfig[doc.status] || stageConfig.pending;
            const StatusIcon = status.icon;
            const isSpinning = doc.status === 'processing' || doc.status === 'chunking' || doc.status === 'embedding';
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-white/5 hover:bg-white/[0.03] transition-all items-center"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-white truncate">{doc.name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-400 bg-white/5 px-2 py-1 rounded-md uppercase">{doc.type}</span>
                </div>
                <div className="col-span-2">
                  <span className={'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ' + status.color}>
                    <StatusIcon className={'w-3 h-3' + (isSpinning ? ' animate-spin' : '')} />
                    {status.label}
                  </span>
                </div>
                <div className="col-span-1 text-sm text-slate-400">{doc.chunks || '-'}</div>
                <div className="col-span-1 text-sm text-slate-400">{formatSize(doc.size)}</div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => deleteDocument(doc.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredDocs.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No documents found</p>
            <p className="text-xs text-slate-500 mt-1">Upload documents to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
