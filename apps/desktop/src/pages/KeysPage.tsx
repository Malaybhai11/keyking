import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff, Shield, CheckCircle, Loader } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

interface KeyEntry {
  id: string
  provider: string
  masked_key: string
  added_at: number
  is_valid: boolean
}

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyEntry[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newProvider, setNewProvider] = useState('OpenAI')
  const [newKey, setNewKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({})
  const [isEncrypting, setIsEncrypting] = useState(false)
  const [encryptingStep, setEncryptingStep] = useState(0)

  const providers = ['OpenAI', 'Groq', 'Gemini', 'Mistral', 'Anthropic', 'xAI', 'DeepSeek', 'OpenRouter', 'Cohere']

  const loadKeys = async () => {
    try {
      const result = await invoke<KeyEntry[]>('list_keys')
      setKeys(result)
    } catch (err) {
      console.error('Failed to load keys:', err)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const addKey = async () => {
    if (!newKey) return
    setIsEncrypting(true)
    setEncryptingStep(0)

    const steps = [
      () => setEncryptingStep(1),
      () => setEncryptingStep(2),
      () => setEncryptingStep(3),
      async () => {
        try {
          await invoke('add_key', { provider: newProvider, plaintextKey: newKey })
          await loadKeys()
          setNewKey('')
          setShowAdd(false)
        } catch (err) {
          console.error('Failed to add key:', err)
          alert(`Failed to add key: ${err}`)
        } finally {
          setIsEncrypting(false)
        }
      }
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600))
      await steps[i]()
    }
  }

  const removeKey = async (id: string) => {
    try {
      await invoke('remove_key', { id })
      await loadKeys()
    } catch (err) {
      console.error('Failed to remove key:', err)
    }
  }

  const validateKey = async (id: string) => {
    setValidatingId(id)
    try {
      const result = await invoke<boolean>('validate_key', { id })
      setValidationResults(prev => ({ ...prev, [id]: result }))
      if (result) {
        await loadKeys()
      }
    } catch (err) {
      console.error('Validation failed:', err)
      setValidationResults(prev => ({ ...prev, [id]: false }))
    } finally {
      setValidatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {isEncrypting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#121212] border border-[#f59e0b]/30 rounded-xl p-6 w-[400px] shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b] border border-[#f59e0b]/20">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-sans">Secure Key Vaulting</h3>
                <p className="text-xs text-gray-400">Zero-Trust Cryptographic Pipeline</p>
              </div>
            </div>
            
            <div className="space-y-4 font-sans">
              {[
                'Reading local hardware fingerprint...',
                'Deriving PBKDF2 key from system salt...',
                'Encrypting key with AES-256-GCM...',
                'Hashing descriptor and storing payload...'
              ].map((text, idx) => {
                const isDone = encryptingStep > idx
                const isActive = encryptingStep === idx
                return (
                  <div key={idx} className={`flex items-center gap-3 transition-opacity duration-300 ${isDone || isActive ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex items-center justify-center">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full bg-green-950 border border-green-500 flex items-center justify-center text-green-400 text-xs font-bold">✓</div>
                      ) : isActive ? (
                        <Loader className="w-4 h-4 text-[#f59e0b] animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-600" />
                      )}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-[#f59e0b] font-medium' : 'text-gray-300'}`}>
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <div className="h-1.5 w-full bg-[#1f1f1f] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] transition-all duration-700 ease-out" 
                style={{ width: `${(encryptingStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
              className="bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex-1 relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter API key"
                className="w-full bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 pr-10 text-white"
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
            {keys.map(key => {
              const validationResult = key.id in validationResults ? validationResults[key.id] : key.is_valid
              return (
                <tr key={key.id} className="border-t border-[#1f1f1f]">
                  <td className="py-3">{key.provider}</td>
                  <td className="py-3 font-mono text-sm">{key.masked_key}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${validationResult ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      <Shield className="w-3 h-3" />
                      {validationResult ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => validateKey(key.id)}
                        disabled={validatingId === key.id}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition disabled:opacity-50"
                        title="Validate key"
                      >
                        {validatingId === key.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeKey(key.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
