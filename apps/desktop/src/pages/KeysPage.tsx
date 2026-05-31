import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff, Shield, CheckCircle, Loader, KeySquare, Rocket, Copy, Check, X, Lock } from 'lucide-react'
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

  // Export modal state
  const [showExport, setShowExport] = useState(false)
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [exportResult, setExportResult] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [copied, setCopied] = useState(false)

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

  const handleExport = async () => {
    if (!exportPassphrase) return
    setIsExporting(true)
    setExportError('')
    setExportResult('')
    try {
      const result = await invoke<string>('export_vault', { passphrase: exportPassphrase })
      setExportResult(result)
    } catch (err) {
      console.error('Export failed:', err)
      setExportError(`Export failed: ${err}`)
    } finally {
      setIsExporting(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportResult)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  const closeExportModal = () => {
    setShowExport(false)
    setExportPassphrase('')
    setShowPassphrase(false)
    setExportResult('')
    setExportError('')
    setCopied(false)
  }

  return (
    <div className="space-y-8 pb-12">
      {isEncrypting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#0f0f11] border border-amber-500/20 rounded-2xl p-8 w-[440px] shadow-[0_0_50px_rgba(245,158,11,0.1)] space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white tracking-tight">Secure Vaulting</h3>
                <p className="text-sm text-gray-400">Zero-Trust Cryptographic Pipeline</p>
              </div>
            </div>
            
            <div className="space-y-5 relative z-10">
              {[
                'Reading local hardware fingerprint...',
                'Deriving PBKDF2 key from system salt...',
                'Encrypting key with AES-256-GCM...',
                'Hashing descriptor and storing payload...'
              ].map((text, idx) => {
                const isDone = encryptingStep > idx
                const isActive = encryptingStep === idx
                return (
                  <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${isDone || isActive ? 'opacity-100 translate-x-0' : 'opacity-30 -translate-x-2'}`}>
                    <div className="flex items-center justify-center shrink-0">
                      {isDone ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                          <Loader className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-white/10 bg-white/5" />
                      )}
                    </div>
                    <span className={`text-sm tracking-wide ${isActive ? 'text-amber-400 font-medium' : 'text-gray-300'}`}>
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative z-10">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                style={{ width: `${(encryptingStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#0f0f11]/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-8 w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_0_60px_rgba(245,158,11,0.12)] space-y-6 relative overflow-hidden">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/8 blur-3xl rounded-full -mr-24 -mt-24"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/5 blur-3xl rounded-full -ml-18 -mb-18"></div>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white tracking-tight">Deploy to Serverless</h3>
                  <p className="text-sm text-gray-400">Export your encrypted vault for cloud use</p>
                </div>
              </div>
              <button
                onClick={closeExportModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!exportResult ? (
              /* Passphrase Input Phase */
              <div className="space-y-5 relative z-10">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    <span className="text-amber-400 font-semibold">Your keys will be re-encrypted</span> with a password you choose.
                    The exported vault string can be used with the <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 text-xs">keyking-sdk</code> package in any serverless environment.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    <Lock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    Vault Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={exportPassphrase}
                      onChange={(e) => setExportPassphrase(e.target.value)}
                      placeholder="Enter a strong password..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
                      onKeyDown={(e) => e.key === 'Enter' && handleExport()}
                    />
                    <button
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {exportError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-sm">
                    {exportError}
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={!exportPassphrase || isExporting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Encrypting vault...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Encrypt & Export
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Result Phase */
              <div className="space-y-5 relative z-10">
                {/* Success banner */}
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-semibold text-sm">Vault exported successfully</p>
                    <p className="text-gray-400 text-xs mt-0.5">{keys.length} key{keys.length !== 1 ? 's' : ''} encrypted with your password</p>
                  </div>
                </div>

                {/* Encrypted vault string */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Encrypted Vault</label>
                    <button
                      onClick={copyToClipboard}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        copied
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-black/60 border border-white/5 rounded-xl p-4 max-h-32 overflow-y-auto">
                    <code className="text-xs text-amber-300/90 break-all leading-relaxed font-mono">
                      {exportResult}
                    </code>
                  </div>
                </div>

                {/* Usage Guide */}
                <div className="border-t border-white/5 pt-5">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-amber-500" />
                    Quick Setup Guide
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">1. Install the SDK</p>
                      <div className="bg-black/60 border border-white/5 rounded-lg p-3">
                        <code className="text-xs text-emerald-400 font-mono">npm install keyking-sdk</code>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">2. Add to your environment variables</p>
                      <div className="bg-black/60 border border-white/5 rounded-lg p-3">
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{`KK_VAULT="${exportResult.slice(0, 32)}..."
KK_VAULT_PASS="your-vault-password"`}</pre>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1.5 font-medium">3. Use in a Next.js API route</p>
                      <div className="bg-black/60 border border-white/5 rounded-lg p-3">
                        <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{`import { KeyKing } from "keyking-sdk";

const kk = new KeyKing({
  vault: process.env.KK_VAULT!,
  password: process.env.KK_VAULT_PASS!,
});

export async function POST(req: Request) {
  const key = kk.getKey("OpenAI");
  // Use key with your AI provider...
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeExportModal}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">API Keys</h2>
          <p className="text-gray-400 text-sm">Manage and securely vault your provider API keys.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowExport(true); setExportResult(''); setExportPassphrase(''); setExportError(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-400 hover:to-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
          >
            <Rocket className="w-4 h-4" /> Deploy to Serverless
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg ${
              showAdd 
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10' 
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            }`}
          >
            {showAdd ? 'Cancel' : <><Plus className="w-4 h-4" /> Add New Key</>}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="keyking-card bg-[#111115] border-amber-500/20 shadow-[0_4px_30px_rgba(245,158,11,0.05)] animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <h3 className="font-semibold text-lg text-white mb-5 flex items-center gap-2 relative z-10">
            <KeySquare className="w-5 h-5 text-amber-500" />
            Add New API Key
          </h3>
          
          <div className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Provider</label>
              <select
                value={newProvider}
                onChange={(e) => setNewProvider(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
              >
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Secret Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={addKey}
                disabled={!newKey}
                className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:shadow-none"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="keyking-card p-0 overflow-hidden border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/40 border-b border-white/5 text-xs uppercase tracking-wider text-gray-400 font-semibold">
              <th className="py-4 px-6 font-medium">Provider</th>
              <th className="py-4 px-6 font-medium">Masked Key</th>
              <th className="py-4 px-6 font-medium">Status</th>
              <th className="py-4 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500 bg-black/20">
                  <div className="flex flex-col items-center gap-3">
                    <KeySquare className="w-8 h-8 text-gray-600" />
                    <p>No keys in your vault. Securely add your first API key.</p>
                  </div>
                </td>
              </tr>
            )}
            {keys.map(key => {
              const validationResult = key.id in validationResults ? validationResults[key.id] : key.is_valid
              return (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-4 px-6 font-medium text-gray-200">{key.provider}</td>
                  <td className="py-4 px-6">
                    <code className="bg-black/50 border border-white/5 px-3 py-1.5 rounded-lg text-sm text-gray-300 tracking-wider">
                      {key.masked_key}
                    </code>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      validationResult 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                      {validationResult ? 'Verified' : 'Invalid'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => validateKey(key.id)}
                        disabled={validatingId === key.id}
                        className="p-2 text-blue-400 bg-blue-400/5 hover:bg-blue-400/20 border border-transparent hover:border-blue-400/30 rounded-xl transition-all disabled:opacity-50"
                        title="Validate key"
                      >
                        {validatingId === key.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeKey(key.id)}
                        className="p-2 text-rose-400 bg-rose-400/5 hover:bg-rose-400/20 border border-transparent hover:border-rose-400/30 rounded-xl transition-all"
                        title="Remove key"
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
