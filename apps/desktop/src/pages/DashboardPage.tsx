import { useEffect, useState } from 'react'
import { Activity, Key, Zap, AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react'
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

  const maskedKey = systemKey ? systemKey.slice(0, 12) + '\u2022'.repeat(8) : ''
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="keyking-card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1f1f1f] rounded-lg">
                <stat.icon className="w-5 h-5 keyking-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="keyking-card">
        <h3 className="text-lg font-semibold mb-4">Your System API Key</h3>
        <p className="text-sm text-gray-400 mb-3">
          Use this key to authenticate requests to your local proxy. Generated per session.
        </p>
        <div className="flex items-center gap-2 bg-[#1f1f1f] rounded-lg p-3 font-mono text-sm">
          <code className="flex-1 break-all">
            {showKey ? systemKey : maskedKey}
          </code>
          <button
            onClick={() => setShowKey(!showKey)}
            className="p-1.5 text-gray-400 hover:text-white transition"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCopyKey}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#f59e0b] text-black rounded-md text-xs font-bold hover:bg-[#d97706] transition"
          >
            {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedKey ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="keyking-card">
        <h3 className="text-lg font-semibold mb-4">How to Use</h3>
        <div className="space-y-3 text-sm">
          <div className="bg-[#1f1f1f] rounded-lg p-3 font-mono text-xs">
            <div className="text-gray-400 mb-1"># Non-streaming request</div>
            <pre className="whitespace-pre-wrap">{curlExample}</pre>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-3 font-mono text-xs">
            <div className="text-gray-400 mb-1"># Use as env var with any OpenAI SDK</div>
            <pre className="whitespace-pre-wrap">{envExample}</pre>
          </div>
          <div className="bg-[#1f1f1f] rounded-lg p-3 font-mono text-xs">
            <div className="text-gray-400 mb-1"># Streaming request</div>
            <pre className="whitespace-pre-wrap">{streamExample}</pre>
          </div>
        </div>
      </div>

      <div className="keyking-card">
        <h3 className="text-lg font-semibold mb-4">Proxy Configuration</h3>
        <div className="flex items-center justify-between bg-[#1f1f1f] rounded-lg p-4 font-mono text-sm">
          <code>{proxyUrl}</code>
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1 px-3 py-1 bg-[#f59e0b] text-black rounded-md text-xs font-bold hover:bg-[#d97706] transition"
          >
            {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedUrl ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
