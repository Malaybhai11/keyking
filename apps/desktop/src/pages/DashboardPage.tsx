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
    { label: 'Active Keys', value: String(keyCount), icon: Key, bg: 'bg-neo-cyan' },
    { label: 'Requests Today', value: String(successCount), icon: Activity, bg: 'bg-neo-green' },
    { label: 'Tokens Used', value: totalTokens > 0 ? totalTokens.toLocaleString() : '-', icon: Zap, bg: 'bg-neo-yellow' },
    { label: 'Anomalies', value: '0', icon: AlertTriangle, bg: 'bg-neo-pink' },
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
        <h2 className="text-4xl font-black font-display tracking-tight text-neo-dark mb-2 uppercase">Dashboard</h2>
        <p className="text-neo-dark/80 font-bold text-sm">Your universal API gateway is running and ready to handle requests.</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="keyking-card flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <div className="text-4xl font-black font-display text-neo-dark tracking-tight">{stat.value}</div>
              <div className={`w-10 h-10 border-3 border-neo-dark shadow-neo-sm flex items-center justify-center ${stat.bg}`}>
                <stat.icon className="w-5 h-5 text-neo-dark" />
              </div>
            </div>
            <div className="text-sm font-bold font-display text-neo-dark uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-neo-yellow border-3 border-neo-dark shadow-neo-md p-6 relative overflow-hidden group hover:-translate-y-1 hover:shadow-neo-lg transition-all duration-200">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-white border-3 border-neo-dark shadow-neo-sm">
              <Key className="w-5 h-5 text-neo-dark" />
            </div>
            <div>
              <h3 className="text-xl font-black font-display uppercase text-neo-dark">Your System API Key</h3>
              <p className="text-sm font-bold text-neo-dark mt-0.5">
                Use this key to authenticate requests to your local proxy. It is generated securely per session.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white border-3 border-neo-dark p-2 pl-4 font-mono text-sm shadow-neo-sm">
            <code className="flex-1 break-all text-neo-dark font-bold text-lg tracking-wider">
              {showKey ? systemKey : maskedKey}
            </code>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowKey(!showKey)}
                className="p-3 bg-neo-bg hover:bg-neo-cyan text-neo-dark border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all cursor-pointer"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-2 px-6 py-3 bg-neo-pink text-white border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
              >
                {copiedKey ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="keyking-card flex flex-col h-full bg-neo-cyan">
          <div className="flex items-center gap-2 mb-5">
            <Terminal className="w-6 h-6 text-neo-dark" />
            <h3 className="text-xl font-black font-display uppercase text-neo-dark">Quick Integration</h3>
          </div>
          <div className="space-y-4 text-sm flex-1">
            <div className="bg-white border-3 border-neo-dark p-4 font-mono text-xs shadow-neo-sm">
              <div className="flex items-center justify-between mb-2 pb-2 border-b-3 border-neo-dark">
                <span className="text-neo-dark font-display font-black text-xs uppercase tracking-wider">Standard Request</span>
              </div>
              <pre className="whitespace-pre-wrap text-neo-dark font-bold leading-relaxed">{curlExample}</pre>
            </div>
            <div className="bg-white border-3 border-neo-dark p-4 font-mono text-xs shadow-neo-sm">
              <div className="flex items-center justify-between mb-2 pb-2 border-b-3 border-neo-dark">
                <span className="text-neo-dark font-display font-black text-xs uppercase tracking-wider">Streaming Request</span>
              </div>
              <pre className="whitespace-pre-wrap text-neo-dark font-bold leading-relaxed">{streamExample}</pre>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full">
          <div className="keyking-card bg-neo-pink">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-white" />
              <h3 className="text-xl font-black font-display uppercase text-white">Environment Variables</h3>
            </div>
            <p className="text-sm font-bold text-white mb-4 leading-relaxed">
              Drop these into your `.env` file to instantly route all your OpenAI SDK traffic through KeyKing without changing any code.
            </p>
            <div className="bg-white border-3 border-neo-dark p-4 font-mono text-xs shadow-neo-sm">
              <pre className="whitespace-pre-wrap text-neo-dark font-bold leading-relaxed">{envExample}</pre>
            </div>
          </div>

          <div className="keyking-card flex-1 bg-white">
            <h3 className="text-xl font-black font-display uppercase text-neo-dark mb-4">Proxy Configuration</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neo-bg border-3 border-neo-dark p-2 pl-4 gap-4 font-mono text-sm shadow-neo-sm">
              <code className="text-neo-dark font-bold break-all">{proxyUrl}</code>
              <button
                onClick={handleCopyUrl}
                className="flex shrink-0 items-center gap-2 px-4 py-3 bg-neo-yellow text-neo-dark border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
              >
                {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedUrl ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
