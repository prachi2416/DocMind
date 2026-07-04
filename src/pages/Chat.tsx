import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Send, FileText, Sparkles, Trash2, MessageSquare, Search, AlertCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react';

interface Source {
  document: string;
  excerpt: string;
  score: number;
  page: number;
}

interface Message {
  id?: number;
  conversation_id: number;
  role: string;
  content: string;
  sources: Source[];
  created_at: string;
  error?: boolean;
  retryable?: boolean;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamingText]);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data);
          if (data.length > 0 && !activeConvo) {
            setActiveConvo(data[0].id);
          }
        }
      } catch (err) {
        console.error('Fetch conversations error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConvo) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?conversation_id=${activeConvo}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Fetch messages error:', err);
      }
    };
    fetchMessages();
  }, [activeConvo]);

  const createConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' }),
      });
      if (res.ok) {
        const convo = await res.json();
        setConversations(prev => [convo, ...prev]);
        setActiveConvo(convo.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('Create conversation error:', err);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvo === id) {
        const remaining = conversations.filter(c => c.id !== id);
        setActiveConvo(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  // Update conversation title from first user message
  const updateConversationTitle = useCallback(async (convoId: number, title: string) => {
    try {
      await fetch('/api/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convoId, title }),
      });
      setConversations(prev => prev.map(c => c.id === convoId ? { ...c, title } : c));
    } catch (err) {
      console.error('Update title error:', err);
    }
  }, []);

  // Save a message to the database
  const saveMessage = useCallback(async (conversationId: number, role: string, content: string, sources: Source[]) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, role, content, sources }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Save message error:', err);
    }
    return null;
  }, []);

  // Animate text appearing character by character for a natural typing effect
  const animateText = useCallback((text: string, onDone: () => void) => {
    let i = 0;
    setStreamingText('');
    const interval = setInterval(() => {
      if (i < text.length) {
        // Reveal in chunks of 1-3 chars for natural feel
        const chunkSize = Math.min(Math.floor(Math.random() * 3) + 1, text.length - i);
        i += chunkSize;
        setStreamingText(text.slice(0, i));
      } else {
        clearInterval(interval);
        onDone();
      }
    }, 10);
    return interval;
  }, []);

  // Parse SSE stream from the backend
  const parseSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onToken: (token: string) => void,
    onSources: (sources: Source[]) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { onDone(); return; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { onDone(); return; }

            try {
              const parsed = JSON.parse(data);
              if (parsed.token) onToken(parsed.token);
              if (parsed.sources) onSources(parsed.sources);
              if (parsed.answer) onToken(parsed.answer);
            } catch {
              // Not JSON — treat as raw text token
              if (data) onToken(data);
            }
          }
        }
      }
    } catch (err: any) {
      onError(err.message || 'Stream read error');
    }
  }, []);

  // Core query function — calls the API and handles the response
  const queryBackend = useCallback(async (question: string, conversationId: number, retryCount = 0) => {
    setIsStreaming(true);
    setStreamingText('');
    setStreamingSources([]);

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversation_id: conversationId }),
        signal: controller.signal,
      });

      // Handle non-OK responses
      if (!res.ok) {
        let errorData: any = {};
        try { errorData = await res.json(); } catch { /* ignore parse error */ }

        const isBackendDown = errorData.backend_unavailable || res.status === 503;

        if (isBackendDown) {
          setBackendStatus('unavailable');
        }

        // Auto-retry up to 2 times on transient errors
        if (retryCount < 2 && (res.status >= 500 || res.status === 0)) {
          await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
          return queryBackend(question, conversationId, retryCount + 1);
        }

        const errorMsg = errorData.error || `Request failed (${res.status})`;
        throw new Error(errorMsg);
      }

      setBackendStatus('available');

      const contentType = res.headers.get('content-type') || '';

      // --- Streaming response (SSE) ---
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        let fullText = '';
        let finalSources: Source[] = [];

        await parseSSEStream(
          reader,
          (token) => {
            fullText += token;
            setStreamingText(fullText);
          },
          (sources) => {
            finalSources = sources;
            setStreamingSources(sources);
          },
          async () => {
            // Stream done — save and finalize
            setIsStreaming(false);
            const saved = await saveMessage(conversationId, 'assistant', fullText, finalSources);
            if (saved) setMessages(prev => [...prev, saved]);
            setStreamingText('');
            setStreamingSources([]);
          },
          (err) => {
            setIsStreaming(false);
            setStreamingText('');
            const errMsg: Message = {
              conversation_id: conversationId,
              role: 'assistant',
              content: `Stream error: ${err}`,
              sources: [],
              created_at: new Date().toISOString(),
              error: true,
              retryable: true,
            };
            setMessages(prev => [...prev, errMsg]);
          },
        );
        return;
      }

      // --- JSON response ---
      const data = await res.json();
      const answer: string = data.answer || '';
      const sources: Source[] = data.sources || [];

      // Animate the answer text for a natural feel
      const animInterval = animateText(answer, async () => {
        // Animation done — show sources and save
        setStreamingSources(sources);
        setIsStreaming(false);

        const saved = await saveMessage(conversationId, 'assistant', answer, sources);
        if (saved) setMessages(prev => [...prev, saved]);

        // Brief delay to show sources, then clear streaming state
        setTimeout(() => {
          setStreamingText('');
          setStreamingSources([]);
        }, 100);
      });

    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled

      setIsStreaming(false);
      setStreamingText('');
      setStreamingSources([]);

      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      if (isNetworkError) setBackendStatus('unavailable');

      const errMsg: Message = {
        conversation_id: conversationId,
        role: 'assistant',
        content: isNetworkError
          ? 'Unable to reach the RAG backend. Please ensure Ollama and FastAPI are running.'
          : err.message || 'An unexpected error occurred.',
        sources: [],
        created_at: new Date().toISOString(),
        error: true,
        retryable: retryCount < 2,
      };
      setMessages(prev => [...prev, errMsg]);
    }
  }, [saveMessage, animateText, parseSSEStream]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    let convoId = activeConvo;

    // Auto-create conversation if none is active
    if (!convoId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: input.trim().slice(0, 50) }),
        });
        if (res.ok) {
          const convo = await res.json();
          setConversations(prev => [convo, ...prev]);
          setActiveConvo(convo.id);
          convoId = convo.id;
        }
      } catch (err) {
        console.error('Auto-create conversation error:', err);
        return;
      }
    }

    if (!convoId) return;

    const userMsg = input.trim();
    setInput('');

    // Save user message to DB
    const savedUser = await saveMessage(convoId, 'user', userMsg, []);
    if (savedUser) {
      setMessages(prev => [...prev, savedUser]);
    }

    // Update conversation title from first message
    const currentConvo = conversations.find(c => c.id === convoId);
    if (currentConvo && currentConvo.title === 'New Conversation') {
      const title = userMsg.length > 50 ? userMsg.slice(0, 47) + '...' : userMsg;
      updateConversationTitle(convoId, title);
    }

    // Query the backend
    await queryBackend(userMsg, convoId);
  };

  // Retry a failed message
  const retryMessage = async (failedMsg: Message) => {
    // Remove the error message
    setMessages(prev => prev.filter(m => m !== failedMsg));

    // Find the last user message before this error
    const failedIdx = messages.indexOf(failedMsg);
    let userQuestion = '';
    for (let i = failedIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuestion = messages[i].content;
        break;
      }
    }

    if (userQuestion && failedMsg.conversation_id) {
      await queryBackend(userQuestion, failedMsg.conversation_id);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation Sidebar */}
      <div className="w-72 border-r border-white/10 bg-slate-950/50 flex flex-col shrink-0 hidden md:flex">
        <div className="p-4">
          <button onClick={createConversation} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {filteredConversations.map(convo => (
            <button
              key={convo.id}
              onClick={() => setActiveConvo(convo.id)}
              className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ' + (
                activeConvo === convo.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 border border-blue-500/30'
                  : 'hover:bg-white/5'
              )}
            >
              <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-300 truncate flex-1">{convo.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
              </button>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Backend status banner */}
        {backendStatus === 'unavailable' && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 shrink-0">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300">RAG backend unavailable — ensure Ollama and FastAPI are running</span>
          </div>
        )}

        {!activeConvo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Start a Conversation</h2>
              <p className="text-sm text-slate-400 mb-6 max-w-sm">Ask questions about your documents and get AI-powered answers with source citations.</p>
              <button onClick={createConversation} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[80%]">
                    {/* Error message */}
                    {msg.error ? (
                      <div className="glass rounded-2xl px-5 py-3 border border-rose-500/20">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-rose-300">{msg.content}</p>
                            {msg.retryable && (
                              <button
                                onClick={() => retryMessage(msg)}
                                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={'rounded-2xl px-5 py-3 ' + (
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-violet-600 text-white'
                            : 'glass text-slate-200'
                        )}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" /> Sources
                            </p>
                            {msg.sources.map((src, j) => (
                              <div key={j} className="glass rounded-xl p-3 hover:bg-white/[0.08] transition-all">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-blue-400">{src.document}</span>
                                  <div className="flex items-center gap-2">
                                    {src.page > 0 && <span className="text-xs text-slate-500">Page {src.page}</span>}
                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                      {Math.round(src.score * 100)}%
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-2">{src.excerpt}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming / typing indicator */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="glass rounded-2xl px-5 py-3">
                      {streamingText ? (
                        <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {streamingText}
                          <span className="typing-cursor" />
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-slate-500">Searching documents...</span>
                        </div>
                      )}
                    </div>
                    {streamingSources.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Sources
                        </p>
                        {streamingSources.map((src, j) => (
                          <div key={j} className="glass rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-400">{src.document}</span>
                              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                {Math.round(src.score * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">{src.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="glass-strong rounded-2xl flex items-end gap-3 p-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask about your documents..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32"
                  disabled={isStreaming}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-30 disabled:hover:shadow-none shrink-0"
                >
                  {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-600 text-center mt-2">
                {backendStatus === 'unavailable'
                  ? 'Backend offline — start Ollama and FastAPI to enable responses'
                  : 'DocMind uses local RAG with Ollama. Responses are generated from your indexed documents.'
                }
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
