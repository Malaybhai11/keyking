import { useState, useEffect } from 'react'
import { Plus, Trash2, Eye, EyeOff, Shield, CheckCircle, Loader, KeySquare, Copy, Check, X, Lock, BookOpen, ChevronDown } from 'lucide-react'
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
  const [showGuide, setShowGuide] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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
        <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border-4 border-neo-dark p-8 w-[440px] shadow-neo-xl space-y-8 relative overflow-hidden">
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-neo-cyan flex items-center justify-center border-3 border-neo-dark shadow-neo-sm">
                <Shield className="w-6 h-6 text-neo-dark animate-pulse" />
              </div>
              <div>
                <h3 className="font-black font-display text-2xl text-neo-dark tracking-tight uppercase">Secure Vaulting</h3>
                <p className="text-sm font-bold text-neo-dark/80">Zero-Trust Cryptographic Pipeline</p>
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
                        <div className="w-6 h-6 bg-neo-green border-2 border-neo-dark flex items-center justify-center text-neo-dark shadow-neo-sm">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : isActive ? (
                        <div className="w-6 h-6 bg-neo-yellow border-2 border-neo-dark flex items-center justify-center shadow-neo-sm">
                          <Loader className="w-4 h-4 text-neo-dark animate-spin" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-neo-dark bg-neo-bg" />
                      )}
                    </div>
                    <span className={`text-sm tracking-wide font-bold ${isActive ? 'text-neo-dark' : 'text-neo-dark/60'}`}>
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
            
            <div className="h-3 w-full bg-neo-bg border-3 border-neo-dark relative z-10 shadow-neo-sm">
              <div 
                className="h-full bg-neo-pink border-r-3 border-neo-dark transition-all duration-700 ease-out" 
                style={{ width: `${(encryptingStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Free Tier Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-neo-bg border-4 border-neo-dark p-0 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-neo-xl relative flex flex-col">
            <div className="sticky top-0 bg-neo-yellow border-b-4 border-neo-dark px-6 py-4 flex items-center justify-between z-10 shadow-sm">
              <h3 className="font-display font-black text-neo-dark text-xl md:text-2xl uppercase tracking-wider flex items-center gap-2"><BookOpen className="w-6 h-6" /> The Free Tier Catalog</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-white/50 transition-colors cursor-pointer">
                <X className="w-6 h-6 text-neo-dark" />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-6 bg-[#f4f4f0]">
              <p className="text-lg font-bold text-neo-dark leading-relaxed max-w-3xl border-3 border-neo-dark bg-white p-4 shadow-neo-sm">
                Over 100+ free models across 16 providers. Mistral alone contributes ~1B; everything else is bonus. Get your keys below, drop them in KeyKing, and never pay for tokens again.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Mistral */}
                <div className="bg-white border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Mistral La Plateforme
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~1B/mo shared</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Mistral Large/Medium, Codestral</div>
                    <div className="mt-auto">
                      <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Google Gemini */}
                <div className="bg-neo-yellow border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Google Gemini
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-neo-yellow">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~3M/mo per model</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Gemini 2.5 Flash, Flash-Lite</div>
                    <div className="mt-auto">
                      <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Groq */}
                <div className="bg-neo-green border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Groq
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-neo-green">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~30M/mo per model</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Llama 3.3 70B, Qwen3</div>
                    <div className="mt-auto">
                      <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Cerebras */}
                <div className="bg-neo-cyan border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Cerebras
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-neo-cyan">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~30M/mo shared</div>
                    <div className="bg-white/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Llama 3.1 8B, Qwen3</div>
                    <div className="mt-auto">
                      <a href="https://cloud.cerebras.ai/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* OpenRouter */}
                <div className="bg-white border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    OpenRouter
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~6M/mo per model</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">19+ Free Models</div>
                    <div className="mt-auto">
                      <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Sambanova */}
                <div className="bg-neo-dark text-white border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-black text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Sambanova
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="bg-neo-cyan text-neo-dark px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~3M/mo shared</div>
                    <div className="bg-neo-cyan/50 text-neo-cyan px-2 inline-block border border-neo-cyan font-bold text-sm mb-6 w-fit">DeepSeek V3.1, Llama 3.3</div>
                    <div className="mt-auto">
                      <a href="https://cloud.sambanova.ai/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-black text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Cloudflare Workers AI */}
                <div className="bg-neo-yellow border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Cloudflare Workers AI
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-neo-yellow">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~20M/mo shared</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Qwen3, Llama 4</div>
                    <div className="mt-auto">
                      <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Github Models */}
                <div className="bg-neo-cyan border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Github Models
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col bg-neo-cyan">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~18M/mo est.</div>
                    <div className="bg-white/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">GPT-4o, GPT-4.1</div>
                    <div className="mt-auto">
                      <a href="https://github.com/marketplace/models" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

                {/* Cohere */}
                <div className="bg-white border-4 border-neo-dark shadow-[6px_6px_0px_0px_rgba(33,37,41,1)] overflow-hidden flex flex-col">
                  <div className="bg-neo-dark text-white px-4 py-2 flex justify-between items-center font-display font-black text-sm tracking-wider uppercase">
                    Cohere
                    <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div><div className="w-2.5 h-2.5 rounded-full border-2 border-white/50"></div></div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="bg-neo-cyan px-2 py-1 inline-block border-2 border-neo-dark shadow-neo-sm font-black font-display text-2xl uppercase w-fit mb-2">~1-2M/mo shared</div>
                    <div className="bg-neo-cyan/50 px-2 inline-block border border-neo-dark font-bold text-sm mb-6 w-fit">Command R+</div>
                    <div className="mt-auto">
                      <a href="https://dashboard.cohere.com/" target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-neo-dark text-white py-3 font-display font-black uppercase tracking-wider hover:bg-neo-pink hover:text-neo-dark border-2 border-neo-dark transition-colors shadow-neo-sm">Get API Key ↗</a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="fixed inset-0 bg-neo-dark/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white border-4 border-neo-dark p-8 w-[560px] max-h-[90vh] overflow-y-auto shadow-neo-xl space-y-6 relative overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-neo-purple flex items-center justify-center text-white border-3 border-neo-dark shadow-neo-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black font-display text-2xl text-neo-dark tracking-tight uppercase">Export Vault</h3>
                  <p className="text-sm font-bold text-neo-dark/80">Securely export your keys for external use</p>
                </div>
              </div>
              <button
                onClick={closeExportModal}
                className="p-2 text-neo-dark hover:bg-neo-pink hover:text-white border-3 border-transparent hover:border-neo-dark hover:shadow-neo-sm transition-all cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!exportResult ? (
              /* Passphrase Input Phase */
              <div className="space-y-6 relative z-10">
                <div className="bg-neo-yellow border-3 border-neo-dark p-4 shadow-neo-sm">
                  <p className="text-sm font-bold text-neo-dark leading-relaxed">
                    <span className="font-black font-display uppercase">Your keys will be re-encrypted</span> with a password you choose.
                    The exported vault string can be used with the <code className="bg-white px-1.5 py-0.5 border-2 border-neo-dark shadow-neo-sm text-xs font-mono font-bold">keyking-sdk</code> package in any serverless environment.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black font-display text-neo-dark uppercase tracking-wider mb-2">
                    <Lock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    Vault Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={exportPassphrase}
                      onChange={(e) => setExportPassphrase(e.target.value)}
                      placeholder="Enter a strong password..."
                      className="w-full bg-white border-3 border-neo-dark p-4 pr-12 text-neo-dark font-mono font-bold focus:outline-none focus:bg-neo-yellow transition-all shadow-neo-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleExport()}
                    />
                    <button
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neo-dark hover:text-neo-pink transition-colors cursor-pointer"
                    >
                      {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {exportError && (
                  <div className="bg-neo-pink border-3 border-neo-dark p-3 text-white font-bold text-sm shadow-neo-sm">
                    {exportError}
                  </div>
                )}

                <button
                  onClick={handleExport}
                  disabled={!exportPassphrase || isExporting}
                  className="w-full py-4 bg-neo-green text-neo-dark border-3 border-neo-dark shadow-neo-sm font-display font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-neo-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Encrypting vault...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Encrypt & Export
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Result Phase */
              <div className="space-y-6 relative z-10">
                {/* Success banner */}
                <div className="flex items-center gap-4 bg-neo-green border-3 border-neo-dark p-4 shadow-neo-sm">
                  <div className="w-10 h-10 bg-white border-3 border-neo-dark flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-neo-dark" />
                  </div>
                  <div>
                    <p className="text-neo-dark font-black font-display uppercase text-lg">Vault exported successfully</p>
                    <p className="text-neo-dark/80 font-bold text-sm mt-0.5">{keys.length} key{keys.length !== 1 ? 's' : ''} encrypted with your password</p>
                  </div>
                </div>

                {/* Encrypted vault string */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black font-display text-neo-dark uppercase tracking-wider">Encrypted Vault</label>
                    <button
                      onClick={copyToClipboard}
                      className={`flex items-center gap-2 px-4 py-2 border-3 shadow-neo-sm font-display font-black uppercase text-xs transition-all cursor-pointer ${
                        copied
                          ? 'bg-neo-cyan border-neo-dark text-neo-dark'
                          : 'bg-neo-yellow border-neo-dark text-neo-dark hover:-translate-y-1 hover:shadow-neo-md'
                      }`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-neo-bg border-3 border-neo-dark p-4 max-h-32 overflow-y-auto shadow-neo-sm">
                    <code className="text-sm font-bold text-neo-dark break-all leading-relaxed font-mono">
                      {exportResult}
                    </code>
                  </div>
                </div>

                {/* Usage Guide */}
                <div className="border-t-3 border-neo-dark pt-5">
                  <h4 className="text-lg font-black font-display uppercase text-neo-dark mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-neo-dark" />
                    Quick Setup Guide
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-bold text-neo-dark mb-2">1. Install the SDK</p>
                      <div className="bg-white border-3 border-neo-dark shadow-neo-sm p-3">
                        <code className="text-sm text-neo-dark font-bold font-mono">npm install keyking-sdk</code>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-neo-dark mb-2">2. Add to your environment variables</p>
                      <div className="bg-white border-3 border-neo-dark shadow-neo-sm p-3">
                        <pre className="text-sm text-neo-dark font-bold font-mono whitespace-pre-wrap leading-relaxed">{`KK_VAULT="${exportResult.slice(0, 32)}..."
KK_VAULT_PASS="your-vault-password"`}</pre>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-neo-dark mb-2">3. Use in a Next.js API route</p>
                      <div className="bg-white border-3 border-neo-dark shadow-neo-sm p-3">
                        <pre className="text-sm text-neo-dark font-bold font-mono whitespace-pre-wrap leading-relaxed">{`import { KeyKing } from "keyking-sdk";

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
                  className="w-full py-4 bg-neo-pink border-3 border-neo-dark shadow-neo-sm text-white font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all cursor-pointer"
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
          <h2 className="text-4xl font-black font-display tracking-tight text-neo-dark mb-2 uppercase">API Keys</h2>
          <p className="text-neo-dark/80 font-bold text-sm">Manage and securely vault your provider API keys.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neo-cyan text-neo-dark border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
          >
            <BookOpen className="w-5 h-5" /> Free Tier Guide
          </button>
          <button
            onClick={() => { setShowExport(true); setExportResult(''); setExportPassphrase(''); setExportError(''); }}
            className="flex items-center gap-2 px-6 py-3 bg-neo-purple text-white border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
          >
            <Shield className="w-5 h-5" /> Deploy to Serverless
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-6 py-3 bg-neo-orange text-neo-dark border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
          >
            {showAdd ? 'Cancel' : <><Plus className="w-5 h-5" /> Add New Key</>}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-neo-cyan border-3 border-neo-dark shadow-neo-md p-6 relative overflow-hidden">
          
          <h3 className="font-black font-display text-xl text-neo-dark mb-5 flex items-center gap-2 uppercase">
            <KeySquare className="w-6 h-6 text-neo-dark" />
            Add New API Key
          </h3>
          
          <div className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="w-full md:w-48 relative">
              <label className="block text-xs font-bold font-display text-neo-dark uppercase tracking-wider mb-2">Provider</label>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border-3 border-neo-dark p-3 text-neo-dark font-bold text-left focus:outline-none focus:bg-neo-yellow transition-all shadow-neo-sm flex justify-between items-center"
              >
                {newProvider}
                <div className="border-l-2 border-neo-dark pl-2 ml-2">
                  <ChevronDown className="w-4 h-4 text-neo-dark" />
                </div>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white border-3 border-neo-dark shadow-neo-md z-50 max-h-48 overflow-y-auto">
                  {providers.map(p => (
                    <div
                      key={p}
                      onClick={() => {
                        setNewProvider(p);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left p-3 border-b-2 border-neo-dark last:border-b-0 hover:bg-neo-yellow font-bold text-neo-dark transition-colors cursor-pointer"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-bold font-display text-neo-dark uppercase tracking-wider mb-2">Secret Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-white border-3 border-neo-dark p-3 pr-12 text-neo-dark font-mono font-bold focus:outline-none focus:bg-neo-yellow transition-all shadow-neo-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neo-dark hover:text-neo-pink transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={addKey}
                disabled={!newKey}
                className="w-full md:w-auto px-8 py-3 bg-neo-pink text-white border-3 border-neo-dark font-display font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-neo-md transition-all shadow-neo-sm cursor-pointer"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-3 border-neo-dark shadow-neo-md p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neo-yellow border-b-3 border-neo-dark text-sm font-display font-black uppercase tracking-wider text-neo-dark">
              <th className="py-4 px-6">Provider</th>
              <th className="py-4 px-6">Masked Key</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-3 divide-neo-dark">
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-neo-dark bg-neo-bg">
                  <div className="flex flex-col items-center gap-3">
                    <KeySquare className="w-10 h-10 text-neo-dark" />
                    <p className="font-bold">No keys in your vault. Securely add your first API key.</p>
                  </div>
                </td>
              </tr>
            )}
            {keys.map(key => {
              const validationResult = key.id in validationResults ? validationResults[key.id] : key.is_valid
              return (
                <tr key={key.id} className="hover:bg-neo-bg transition-colors group">
                  <td className="py-4 px-6 font-bold text-neo-dark text-lg">{key.provider}</td>
                  <td className="py-4 px-6">
                    <code className="bg-white border-2 border-neo-dark px-3 py-1.5 text-sm text-neo-dark font-bold tracking-wider shadow-neo-sm">
                      {key.masked_key}
                    </code>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 font-display uppercase text-xs font-black border-2 border-neo-dark shadow-neo-sm ${
                      validationResult 
                        ? 'bg-neo-green text-neo-dark' 
                        : 'bg-neo-pink text-white'
                    }`}>
                      <Shield className="w-4 h-4" />
                      {validationResult ? 'Verified' : 'Invalid'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => validateKey(key.id)}
                        disabled={validatingId === key.id}
                        className="p-2 bg-neo-cyan border-2 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all disabled:opacity-50 text-neo-dark cursor-pointer"
                        title="Validate key"
                      >
                        {validatingId === key.id ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => removeKey(key.id)}
                        className="p-2 bg-neo-pink border-2 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all text-white cursor-pointer"
                        title="Remove key"
                      >
                        <Trash2 className="w-5 h-5" />
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
