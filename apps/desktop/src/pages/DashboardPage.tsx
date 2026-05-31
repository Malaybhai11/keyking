import { useEffect, useState } from 'react'
import { Activity, Key, Zap, AlertTriangle, Copy, Check, Eye, EyeOff, Terminal } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEvents } from '../App'

export default function DashboardPage() {
  const [keyCount, setKeyCount] = useState(0)
  const [proxyPort, setProxyPort] = useState(8787)
  const [systemKey, setSystemKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const { events } = useEvents()

  useEffect(() => {
    invoke<unknown[]>('list_keys').then(keys => setKeyCount(keys.length)).catch(() => {})
    invoke<string>('get_api_key').then(setSystemKey).catch(() => {})
    const unlisten = listen<number>('proxy-started', (event) => {
      setProxyPort(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const successCount = events.filter(e => e.success).length
  const totalTokens = events.reduce((sum, e) => sum + e.tokens_used, 0)

  const proxyUrl = `OPENAI_BASE_URL=http://localhost:${proxyPort}/v1`
  const stats = [
    { label: 'Active Keys', value: String(keyCount), icon: Key },
    { label: 'Requests Today', value: String(successCount), icon: Activity },
    { label: 'Tokens Used', value: totalTokens > 0 ? totalTokens.toLocaleString() : '-', icon: Zap },
    { label: 'Anomalies', value: '0', icon: AlertTriangle },
  ]

  const maskedKey = systemKey ? systemKey.slice(0, 12) + '\u2022'.repeat(24) : ''
  const keyPrefix = systemKey.slice(0, 8)

  const curlExample = `curl http://localhost:${proxyPort}/v1/chat/completions \\
  -H "Authorization: Bearer ${keyPrefix}..." \\
  -H "Content-Type: application/json" \\
  -d '{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "Hello"}]
}'`

  const envExample = `export OPENAI_BASE_URL=http://localhost:${proxyPort}/v1
export OPENAI_API_KEY=${keyPrefix}...`

  const streamExample = `curl http://localhost:${proxyPort}/v1/chat/completions \\
  -H "Authorization: Bearer ${keyPrefix}..." \\
  -H "Content-Type: application/json" \\
  -N \\
  -d '{
  "model": "gpt-4o",
  "stream": true,
  "messages": [{"role": "user", "content": "Hello"}]
}'`

  const handleCopyKey = () => {
    navigator.clipboard.writeText(systemKey)
    setCopiedKey(true)
    setCopiedUrl(false)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(proxyUrl)
    setCopiedUrl(true)
    setCopiedKey(false)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to KeyKing</h2>
        <p className="text-gray-400 text-sm">Your universal API gateway is running and ready to handle requests.</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="keyking-card group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-0 bg-white group-hover:opacity-10 transition-opacity duration-500"></div>
            <div className="flex flex-col gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <stat.icon className="w-5 h-5 text-gray-200" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white tracking-tight mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="keyking-card relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <Key className="w-5 h-5 text-gray-200" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Your System API Key</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Use this key to authenticate requests to your local proxy. It is generated securely per session.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#050505]/80 border border-white/10 rounded-xl p-2 pl-4 font-mono text-sm shadow-inner group-hover:border-white/20 transition-colors">
            <code className="flex-1 break-all text-gray-200 tracking-wider">
              {showKey ? systemKey : maskedKey}
            </code>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors border border-white/5"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-all shadow-sm"
              >
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="keyking-card flex flex-col h-full">
          <div className="flex items-center gap-2 mb-5">
            <Terminal className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Quick Integration</h3>
          </div>
          <div className="space-y-4 text-sm flex-1">
            <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-4 font-mono text-xs hover:border-white/10 transition-colors shadow-inner">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-gray-500 font-sans font-medium text-[11px] uppercase tracking-wider">Standard Request</span>
              </div>
              <pre className="whitespace-pre-wrap text-emerald-400/90 leading-relaxed">{curlExample}</pre>
            </div>
            <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-4 font-mono text-xs hover:border-white/10 transition-colors shadow-inner">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-gray-500 font-sans font-medium text-[11px] uppercase tracking-wider">Streaming Request</span>
              </div>
              <pre className="whitespace-pre-wrap text-emerald-400/90 leading-relaxed">{streamExample}</pre>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full">
          <div className="keyking-card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Drop these into your `.env` file to instantly route all your OpenAI SDK traffic through KeyKing without changing any code.
            </p>
            <div className="bg-[#050505]/80 border border-white/5 rounded-xl p-4 font-mono text-xs shadow-inner">
              <pre className="whitespace-pre-wrap text-gray-300 leading-relaxed">{envExample}</pre>
            </div>
          </div>

          <div className="keyking-card flex-1">
            <h3 className="text-lg font-semibold text-white mb-4">Proxy Configuration</h3>
            <div className="flex items-center justify-between bg-[#050505]/80 border border-white/10 rounded-xl p-1 pl-4 font-mono text-sm shadow-inner group">
              <code className="text-gray-300">{proxyUrl}</code>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg text-xs font-semibold hover:bg-white/10 hover:text-white transition-colors m-1 border border-white/5 group-hover:border-white/10"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-gray-200" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
