'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// ─── Types ────────────────────────────────────────────────────────────────────

type TokenUsage = {
  prompt?: number;
  completion?: number;
  total?: number;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  tokens?: TokenUsage;
};

type ProviderInfo = {
  name: string;
  configured: boolean;
  status: 'active' | 'missing';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let msgCounter = 0;
const nextId = () => `msg_${++msgCounter}_${Date.now()}`;

const estimateTokens = (text: string): number => Math.max(1, Math.round(text.length / 4));

function formatDate(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! I am powered by the **KeyKing Zero-Trust Serverless SDK**.\n\nI support **streaming responses**, **automatic failover** across providers, and **encrypted vault decryption** at the edge.\n\nTry asking me something, or **request a code example** to see markdown rendering in action!',
  provider: 'KeyKing SDK',
};

const SUGGESTIONS = [
  'Write a Python function to reverse a linked list',
  'Explain zero-trust architecture in simple terms',
  'Write a React hook for debounced search',
  'Compare GPT-4o, Claude 3.5, and Llama 3.3',
];

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant powered by the KeyKing Zero-Trust SDK. Respond clearly and concisely. Use markdown formatting for code, lists, and structured content.';

// ─── Code Block Component ─────────────────────────────────────────────────────

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language || 'code'}</span>
        <button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}

// ─── Markdown Components ──────────────────────────────────────────────────────

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    if (match) {
      return <CodeBlock language={match[1]}>{codeString}</CodeBlock>;
    }
    if (!String(children).includes('\n')) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock>{codeString}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [model, setModel] = useState('gpt-4o');
  const [priorities, setPriorities] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [showSettings, setShowSettings] = useState(false);

  // Provider dashboard
  const [showProviders, setShowProviders] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Scroll to bottom on new content ──────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Fetch providers ──────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch {
      // silently fail — providers panel just shows nothing
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showProviders && providers.length === 0) {
      fetchProviders();
    }
  }, [showProviders, providers.length, fetchProviders]);

  // ── Parse routing rules ──────────────────────────────────────────────────
  const parsePriorities = useCallback(() => {
    if (!priorities.trim()) return [];
    return priorities
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [provider, rModel] = s.split(':').map((x) => x.trim());
        return { provider, model: rModel || model };
      });
  }, [priorities, model]);

  // ── Cancel stream ────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setStreamingId(null);
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;

      setInput('');
      setError(null);

      const userMsg: Message = { id: nextId(), role: 'user', content: text };
      const assistantId = nextId();
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreamingId(assistantId);
      setIsLoading(true);

      const payload = {
        messages: [
          ...messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ],
        model,
        routingRules: parsePriorities(),
        stream: true,
        system: systemPrompt,
      };

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(errData.error || `Request failed (${res.status})`);
        }

        const contentType = res.headers.get('Content-Type') || '';

        if (contentType.includes('text/event-stream')) {
          // ── SSE streaming ────────────────────────────────────────────────
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullContent = '';
          let finalProvider: string | undefined;
          let finalTokens: TokenUsage | undefined;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const chunkLine = buffer.slice(0, boundary).trim();
              buffer = buffer.slice(boundary + 2);

              if (chunkLine.startsWith('data: ')) {
                const data = chunkLine.slice(6);
                if (data === '[DONE]') {
                  // stream complete
                } else {
                  try {
                    const parsed = JSON.parse(data);

                    // Check for error payload
                    if (parsed.error) {
                      throw new Error(parsed.error);
                    }

                    const delta = parsed.choices?.[0]?.delta;
                    if (delta?.content) {
                      fullContent += delta.content;
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId ? { ...m, content: fullContent } : m
                        )
                      );
                    }

                    if (parsed.choices?.[0]?.finish_reason) {
                      finalProvider = parsed._keyking_provider || parsed.model;
                    }
                  } catch (parseErr: any) {
                    if (parseErr.message && !parseErr.message.includes('JSON')) {
                      throw parseErr;
                    }
                    // skip unparseable chunks
                  }
                }
              }
              boundary = buffer.indexOf('\n\n');
            }
          }

          // Finalize the message
          const estimatedTokens: TokenUsage = {
            total: estimateTokens(fullContent),
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: fullContent || '(empty response)',
                    provider: finalProvider || 'Unknown',
                    model: model,
                    tokens: estimatedTokens,
                  }
                : m
            )
          );
        } else {
          // ── JSON response (fallback) ──────────────────────────────────────
          const data = await res.json();
          if (data.choices?.[0]?.message?.content) {
            const content = data.choices[0].message.content;
            const tokens: TokenUsage = data.usage
              ? {
                  prompt: data.usage.prompt_tokens,
                  completion: data.usage.completion_tokens,
                  total: data.usage.total_tokens,
                }
              : { total: estimateTokens(content) };

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content,
                      provider: data._keyking_provider || 'Unknown',
                      model: model,
                      tokens,
                    }
                  : m
              )
            );
          } else {
            throw new Error(data.error || 'Empty response from API');
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled — finalize with what we have
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || '(cancelled)', provider: 'Cancelled' }
                : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `**Error:** ${err.message}` }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        setStreamingId(null);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, model, parsePriorities, systemPrompt]
  );

  // ── Suggestion click ─────────────────────────────────────────────────────
  const handleSuggestion = useCallback(
    (text: string) => {
      setInput(text);
      // Focus the input
      inputRef.current?.focus();
    },
    []
  );

  // ── Export as Markdown ───────────────────────────────────────────────────
  const handleExportMarkdown = useCallback(() => {
    const lines: string[] = [`# KeyKing Chat Export — ${formatDate()}\n`];
    for (const msg of messages) {
      if (msg.id === 'welcome') continue;
      const role = msg.role === 'user' ? '**User**' : `**Assistant**${msg.provider ? ` *(via ${msg.provider})*` : ''}`;
      lines.push(`### ${role}\n\n${msg.content}\n`);
      if (msg.tokens?.total) {
        lines.push(`> ~${msg.tokens.total} tokens used\n`);
      }
    }
    downloadBlob(lines.join('\n'), `keyking-chat-${formatDate()}.md`, 'text/markdown');
  }, [messages]);

  // ── Export as JSON ───────────────────────────────────────────────────────
  const handleExportJSON = useCallback(() => {
    const data = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role,
        content: m.content,
        provider: m.provider,
        model: m.model,
        tokens: m.tokens,
      }));
    downloadBlob(
      JSON.stringify({ exportedAt: new Date().toISOString(), messages: data }, null, 2),
      `keyking-chat-${formatDate()}.json`,
      'application/json'
    );
  }, [messages]);

  // ── Clear chat ───────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (messages.length <= 1) return;
    if (!window.confirm('Clear the entire conversation?')) return;
    handleCancel();
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, [messages.length, handleCancel]);

  // ── Streaming cursor ─────────────────────────────────────────────────────
  const isStreaming = streamingId !== null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-12 lg:p-24 bg-[#0a0a0a] text-white selection:bg-amber-500/30">
      {/* Background gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl flex flex-col h-[85vh] relative z-10">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center mb-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-amber-500 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Powered by KeyKing Zero-Trust SDK
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 text-center">
            Serverless AI Chat
          </h1>
          <p className="text-gray-400 text-center max-w-lg text-sm">
            Streaming · Auto-failover · Zero-Trust Cryptography
          </p>

          {/* ── Toolbar ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg border transition-all ${
                showSettings
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {showSettings ? 'Close Settings' : '⚙ Settings'}
            </button>

            <button
              onClick={() => {
                setShowProviders(!showProviders);
              }}
              className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg border transition-all ${
                showProviders
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {showProviders ? 'Close Providers' : '🔐 Providers'}
            </button>

            {messages.length > 1 && (
              <>
                <button
                  onClick={handleExportMarkdown}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  📄 Export MD
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                >
                  🔧 Export JSON
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-lg border border-red-900/30 bg-red-950/20 text-red-400 hover:bg-red-950/40 transition-all"
                >
                  🗑 Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Settings Panel ─────────────────────────────────────────── */}
        {showSettings && (
          <div className="mb-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg flex flex-col gap-4 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="w-full">
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">
                  Target Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="md:col-span-2 w-full">
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">
                  Fallback Priority Ladder
                </label>
                <input
                  type="text"
                  value={priorities}
                  onChange={(e) => setPriorities(e.target.value)}
                  placeholder="e.g. Groq:llama-3.3-70b-versatile, Anthropic:claude-3-5-sonnet-20241022"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-amber-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="w-full">
              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={2}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* ── Provider Dashboard ─────────────────────────────────────── */}
        {showProviders && (
          <div className="mb-4 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
                🔐 Vault Providers
              </h3>
              <button
                onClick={fetchProviders}
                disabled={providersLoading}
                className="text-[11px] text-amber-500 hover:text-amber-400 disabled:opacity-50 uppercase tracking-wider font-bold"
              >
                {providersLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {providersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Loading providers...
              </div>
            ) : providers.length === 0 ? (
              <p className="text-sm text-gray-500">No providers found in vault.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {providers.map((p) => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      p.status === 'active'
                        ? 'bg-green-950/20 border-green-900/30 text-green-400'
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        p.status === 'active' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-gray-600'
                      }`}
                    />
                    <span className="font-medium truncate">{p.name}</span>
                    {p.status === 'active' && (
                      <span className="text-[10px] uppercase tracking-wider opacity-70 ml-auto">
                        Ready
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] text-gray-600">
              {providers.length > 0
                ? `${providers.filter((p) => p.status === 'active').length} of ${providers.length} providers configured`
                : 'Open the KeyKing Desktop App to add keys to your vault'}
            </p>
          </div>
        )}

        {/* ── Error Banner ───────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-900/30 rounded-xl text-sm text-red-400 flex items-center gap-2 animate-fade-in-up">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
              ✕
            </button>
          </div>
        )}

        {/* ── Chat Container ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 scroll-smooth">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } animate-fade-in-up`}
                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
              >
                <div
                  className={`max-w-[88%] md:max-w-[78%] rounded-2xl px-5 py-3.5 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black rounded-tr-sm'
                      : 'bg-white/10 text-gray-100 border border-white/5 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className={`markdown-content leading-relaxed text-[15px] ${msg.content === '(cancelled)' || msg.content.startsWith('**Error:**') ? 'opacity-60' : ''}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {msg.content || '...'}
                      </ReactMarkdown>
                      {isStreaming && msg.id === streamingId && (
                        <span className="inline-block w-[2px] h-[1em] bg-amber-500 ml-0.5 align-text-bottom animate-cursor-blink" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">
                      {msg.content}
                    </p>
                  )}
                </div>

                {/* Footer: provider badge + tokens */}
                <div className="mt-1.5 flex items-center gap-3">
                  {msg.provider && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-amber-500/80">{msg.provider}</span>
                    </span>
                  )}
                  {msg.tokens?.total && !isStreaming && (
                    <span className="text-[10px] text-gray-600 font-mono">
                      ⚡~{msg.tokens.total} tokens
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots (only when not yet streaming) */}
            {isLoading && !isStreaming && (
              <div className="flex items-start animate-fade-in-up">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions chips (only when no messages beyond welcome) */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="px-4 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-gray-200 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ──────────────────────────────────────────── */}
          <div className="p-4 bg-black/40 border-t border-white/10">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? 'Waiting for response...' : 'Ask something amazing...'}
                className="flex-1 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl py-4 pl-5 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent transition-all shadow-inner disabled:opacity-50"
                disabled={isLoading}
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-2.5 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-colors"
                  title="Cancel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-2.5 bg-amber-500 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
