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
const formatDate = () => new Date().toISOString().split('T')[0];

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
    'Hello! I am powered by the **KeyKing Zero-Trust Serverless SDK**.\n\nI support **streaming responses**, **automatic failover** across providers, and **encrypted vault decryption** at the edge. Try asking me something, or request a code example to see markdown rendering in action!',
  provider: 'KeyKing SDK',
};

const SUGGESTIONS = [
  { label: 'Write a Python function to reverse a linked list', icon: '🐍' },
  { label: 'Explain zero-trust architecture', icon: '🛡️' },
  { label: 'Write a React hook for debounced search', icon: '⚛️' },
  { label: 'Compare GPT-4o, Claude 3.5, and Llama 3.3', icon: '🤖' },
];

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant powered by the KeyKing Zero-Trust SDK. Respond clearly and concisely. Use markdown formatting for code, lists, and structured content.';

const PROVIDER_ICONS: Record<string, string> = {
  OpenAI: '🟢', Groq: '⚡', Anthropic: '🔮', Gemini: '🔷', Mistral: '🌬️',
  xAI: '✕', DeepSeek: '🔵', OpenRouter: '🔀', Cohere: '🌀', Nvidia: '🟩',
  OpencodeZen: '🧘', Cerebras: '⚙️', Sambanova: '🔶', Cloudflare: '☁️', Github: '🐙', Lumos: '💡', TokenRouter: '🚀',
};

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
        <button onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre><code>{children}</code></pre>
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
      return <code className={className} {...props}>{children}</code>;
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Fetch providers ─────────────────────────────────────────���────────────
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch {
      // silently fail
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showProviders && providers.length === 0) fetchProviders();
  }, [showProviders, providers.length, fetchProviders]);

  const parsePriorities = useCallback(() => {
    if (!priorities.trim()) return [];
    return priorities
      .split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => {
        const [provider, rModel] = s.split(':').map((x) => x.trim());
        return { provider, model: rModel || model };
      });
  }, [priorities, model]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
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
        messages: messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }))
          .concat({ role: 'user', content: text }),
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
          // ── SSE streaming ──────────────────────────────────────────────
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullContent = '';
          let finalProvider: string | undefined;

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
                if (data === '[DONE]') break;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.error) throw new Error(parsed.error);

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
                  if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
                }
              }
              boundary = buffer.indexOf('\n\n');
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: fullContent || '(empty response)',
                    provider: finalProvider || 'Unknown',
                    model,
                    tokens: { total: estimateTokens(fullContent) },
                  }
                : m
            )
          );
        } else {
          const data = await res.json();
          if (data.choices?.[0]?.message?.content) {
            const content = data.choices[0].message.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content,
                      provider: data._keyking_provider || 'Unknown',
                      model,
                      tokens: data.usage
                        ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens, total: data.usage.total_tokens }
                        : { total: estimateTokens(content) },
                    }
                  : m
              )
            );
          } else {
            throw new Error(data.error || 'Empty response');
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
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

  const handleSuggestion = useCallback((text: string) => {
    setInput(text);
    inputRef.current?.focus();
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const lines: string[] = [`# KeyKing Chat Export — ${formatDate()}\n`];
    for (const msg of messages) {
      if (msg.id === 'welcome') continue;
      const role = msg.role === 'user'
        ? '**User**'
        : `**Assistant**${msg.provider ? ` *(via ${msg.provider})*` : ''}`;
      lines.push(`### ${role}\n\n${msg.content}\n`);
      if (msg.tokens?.total) lines.push(`> ~${msg.tokens.total} tokens used\n`);
    }
    downloadBlob(lines.join('\n'), `keyking-chat-${formatDate()}.md`, 'text/markdown');
  }, [messages]);

  const handleExportJSON = useCallback(() => {
    const data = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content, provider: m.provider, model: m.model, tokens: m.tokens }));
    downloadBlob(
      JSON.stringify({ exportedAt: new Date().toISOString(), messages: data }, null, 2),
      `keyking-chat-${formatDate()}.json`,
      'application/json'
    );
  }, [messages]);

  const handleClear = useCallback(() => {
    if (messages.length <= 1) return;
    if (!window.confirm('Clear the entire conversation?')) return;
    handleCancel();
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, [messages.length, handleCancel]);

  const isStreaming = streamingId !== null;
  const hasMessages = messages.length > 1;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="noise-bg relative flex min-h-screen flex-col items-center justify-between p-3 md:p-6 lg:p-8 bg-[#0a0a0a] text-white selection:bg-amber-500/30">
      {/* Ambient glow overlays */}
      <div className="fixed pointer-events-none -z-10 inset-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-8%] w-[45%] h-[45%] bg-amber-600/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-12%] right-[-8%] w-[35%] h-[35%] bg-purple-700/8 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[30%] bg-amber-500/4 rounded-full blur-[160px]" />
      </div>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl shrink-0 mb-3 md:mb-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold text-amber-500/90 backdrop-blur-md tracking-wide">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            Powered by KeyKing Zero-Trust SDK
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight gradient-text text-center leading-tight">
            Serverless AI Chat
          </h1>
          <p className="text-xs text-white/30 text-center font-medium tracking-wide">
            Streaming �� Auto-failover · Zero-Trust Cryptography
          </p>
        </div>
      </div>

      {/* ── Main Chat Card ──────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl flex-1 flex flex-col min-h-0 rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="animate-pulse-glow absolute inset-0 rounded-2xl pointer-events-none -z-10" />

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-4 md:px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500/70 select-none hidden sm:inline">
              KeyKing SDK
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-500/70 select-none sm:hidden">
              KK
            </span>
            {hasMessages && (
              <span className="text-[10px] text-white/20 select-none hidden xs:inline">
                {messages.length - 1} messages
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <ToolbarButton
              active={showSettings}
              label="Settings"
              icon="⚙"
              onClick={() => { setShowSettings((v) => !v); setShowProviders(false); }}
            />
            <ToolbarButton
              active={showProviders}
              label="Providers"
              icon="🔐"
              onClick={() => { setShowProviders((v) => !v); setShowSettings(false); }}
            />
            {hasMessages && (
              <>
                <span className="w-px h-4 bg-white/[0.06] mx-0.5" />
                <ToolbarButton label="Export MD" icon="��" onClick={handleExportMarkdown} />
                <ToolbarButton label="Export JSON" icon="📋" onClick={handleExportJSON} />
                <ToolbarButton label="Clear" icon="🗑" onClick={handleClear} danger />
              </>
            )}
          </div>
        </div>

        {/* ── Settings Panel ───────────────────────────────────────────── */}
        {showSettings && (
          <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.015] animate-fade-in-down">
            <div className="px-4 md:px-5 py-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5 block">
                    Target Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-black/50 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-amber-500/40 focus:bg-black/60 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5 block">
                    Fallback Priority Ladder
                  </label>
                  <input
                    type="text"
                    value={priorities}
                    onChange={(e) => setPriorities(e.target.value)}
                    placeholder="e.g. Groq:llama-3.3-70b-versatile, Anthropic:claude-3-5-sonnet-20241022"
                    className="w-full bg-black/50 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-amber-400/90 font-mono placeholder-white/15 focus:outline-none focus:border-amber-500/40 focus:bg-black/60 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1.5 block">
                  System Prompt
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-black/50 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white/70 font-mono placeholder-white/15 focus:outline-none focus:border-amber-500/40 focus:bg-black/60 transition-all resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Provider Dashboard ───────────────────────────────────────── */}
        {showProviders && (
          <div className="shrink-0 border-b border-white/[0.06] bg-white/[0.015] animate-fade-in-down">
            <div className="px-4 md:px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
                  🔐 Vault Providers
                </h3>
                <button
                  onClick={fetchProviders}
                  disabled={providersLoading}
                  className="text-[10px] text-amber-500/70 hover:text-amber-400 disabled:opacity-40 uppercase tracking-wider font-bold transition-colors"
                >
                  {providersLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {providersLoading ? (
                <div className="flex items-center gap-2.5 text-sm text-white/40 py-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Decrypting vault...
                </div>
              ) : providers.length === 0 ? (
                <p className="text-sm text-white/30 py-2">
                  No providers found in vault. Open the KeyKing Desktop App to add keys.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {providers.map((p) => (
                    <div
                      key={p.name}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-all duration-200 ${
                        p.status === 'active'
                          ? 'bg-green-500/[0.06] border-green-500/15 text-green-400'
                          : 'bg-white/[0.02] border-white/[0.05] text-white/30'
                      }`}
                    >
                      <span className="text-sm shrink-0">{PROVIDER_ICONS[p.name] || '🔌'}</span>
                      <span className="font-semibold truncate">{p.name}</span>
                      {p.status === 'active' && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)] shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {providers.length > 0 && (
                <p className="mt-3 text-[10px] text-white/20">
                  {providers.filter((p) => p.status === 'active').length} of {providers.length} providers configured
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Error Banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="shrink-0 border-b border-red-500/10 bg-red-500/[0.04] animate-fade-in-down">
            <div className="px-4 md:px-5 py-2.5 text-xs text-red-400/90 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400/40 hover:text-red-400 transition-colors">✕</button>
            </div>
          </div>
        )}

        {/* ── Messages Area ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 md:py-5 space-y-4 scroll-smooth">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}
                ${msg.id === 'welcome' ? 'animate-fade-in-up' : msg.role === 'user' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
              style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                    : 'bg-white/[0.06] text-white/60 border border-white/[0.06]'
                }`}
              >
                {msg.role === 'user' ? 'U' : '👑'}
              </div>

              {/* Bubble */}
              <div className="min-w-0 flex-1 max-w-[84%] md:max-w-[76%]">
                <div
                  className={`rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black rounded-tr-md'
                      : 'bg-white/[0.04] border border-white/[0.06] text-gray-100 rounded-tl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className={`markdown-content ${(msg.content === '(cancelled)' || msg.content.startsWith('**Error:**')) ? 'opacity-50' : ''}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content || '...'}
                      </ReactMarkdown>
                      {isStreaming && msg.id === streamingId && (
                        <span className="inline-block w-[2px] h-[1.05em] bg-amber-400 ml-0.5 align-text-bottom animate-cursor-blink" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">
                      {msg.content}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className={`flex items-center gap-2.5 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.provider && (
                    <span className="text-[9px] uppercase tracking-widest font-semibold text-white/25 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-amber-500/60">{msg.provider}</span>
                    </span>
                  )}
                  {msg.tokens?.total && !isStreaming && (
                    <span className="text-[9px] text-white/20 font-mono">⚡~{msg.tokens.total}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {isLoading && !isStreaming && (
            <div className="flex gap-3 animate-fade-in-up">
              <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-white/[0.06] text-white/40 border border-white/[0.06]">
                👑
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-5 py-4 flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-amber-400/60 rounded-full" style={{ animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-wrap gap-2 justify-center pt-6 pb-2 animate-fade-in-up">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.label)}
                  className="group flex items-center gap-1.5 px-3.5 py-2 text-xs bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-amber-500/20 rounded-xl text-white/40 hover:text-white/70 transition-all duration-200"
                >
                  <span className="text-sm">{s.icon}</span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Area ───────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 md:px-5 py-3 border-t border-white/[0.06] bg-white/[0.015]">
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isLoading ? 'Waiting for response...' : 'Type a message...'}
                className="w-full bg-black/50 border border-white/[0.07] text-white/90 placeholder-white/20 rounded-xl py-3.5 pl-4 pr-4 text-sm focus:outline-none focus:border-amber-500/40 focus:bg-black/60 transition-all disabled:opacity-40"
                disabled={isLoading}
              />
            </div>

            {isLoading ? (
              <button
                type="button"
                onClick={handleCancel}
                className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl transition-all active:scale-95"
                title="Cancel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 disabled:active:scale-100 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="w-full max-w-4xl shrink-0 mt-2 md:mt-3 text-center">
        <p className="text-[10px] text-white/[0.07] font-mono tracking-wider">
          KEYKING ZERO-TRUST SERVERLESS SDK v3
        </p>
      </div>
    </main>
  );
}

// ─── Toolbar Button Sub-component ─────────────────────────────────────────────

function ToolbarButton({
  active,
  label,
  icon,
  onClick,
  danger,
}: {
  active?: boolean;
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all duration-150 whitespace-nowrap ${
        active
          ? 'bg-amber-500/12 border-amber-500/25 text-amber-400 shadow-sm'
          : danger
            ? 'bg-transparent border-transparent text-white/30 hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/15'
            : 'bg-transparent border-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.04] hover:border-white/[0.06]'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}
