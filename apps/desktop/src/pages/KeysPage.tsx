import React, { useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Shield } from 'lucide-react'

interface KeyEntry {
  id: string
  provider: string
  maskedKey: string
  addedAt: number
  isValid: boolean
}

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newProvider, setNewProvider] = useState('OpenAI')
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const providers = ['OpenAI', 'Groq', 'Gemini', 'Mistral', 'Anthropic', 'xAI', 'DeepSeek', 'OpenRouter', 'Cohere']

  const addKey = () => {
    if (!newKey) return
    const entry: KeyEntry = {
      id: crypto.randomUUID(),
      provider: newProvider,
      maskedKey: newKey.slice(0, 4) + '...' + newKey.slice(-4),
      addedAt: Date.now(),
      isValid: true,
    }
    setKeys([...keys, entry])
    setNewKey('')
    setShowAdd(false)
  }

  const removeKey = (id: string) => {
    setKeys(keys.filter(k => k.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Keys</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b] text-black rounded-lg font-bold hover:bg-[#d97706] transition"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {showAdd && (
        <div className="keyking-card space-y-4">
          <h3 className="font-semibold">Add New Key</h3>
          <div className="flex gap-4">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
              className="bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2"
            >
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex-1 relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter API key"
                className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={addKey}
              className="px-4 py-2 bg-[#f59e0b] text-black rounded-lg font-bold"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="keyking-card">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm">
              <th className="pb-3">Provider</th>
              <th className="pb-3">Key</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No keys configured. Add your first key above.
                </td>
              </tr>
            )}
            {keys.map(key => (
              <tr key={key.id} className="border-t border-[#1f1f1f]">
                <td className="py-3">{key.provider}</td>
                <td className="py-3 font-mono text-sm">{key.maskedKey}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${key.isValid ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    <Shield className="w-3 h-3" />
                    {key.isValid ? 'Valid' : 'Invalid'}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => removeKey(key.id)}
                    className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
