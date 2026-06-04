import { useState } from 'react'
import { Crown, Zap } from 'lucide-react'

export default function SettingsPage() {
  const [tier] = useState<'free' | 'ultra'>('free')
  const [port, setPort] = useState(8787)

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-4xl font-black font-display tracking-tight text-neo-dark mb-2 uppercase">Settings</h2>
        <p className="text-neo-dark/80 font-bold text-sm">Configure your proxy and account.</p>
      </div>
      
      <div className="bg-neo-yellow border-3 border-neo-dark shadow-neo-md p-6">
        <h3 className="text-2xl font-black font-display uppercase mb-4 text-neo-dark">Account</h3>
        <div className="flex items-center gap-4">
          <div className={`p-4 border-3 border-neo-dark shadow-neo-sm bg-white`}>
            {tier === 'ultra' ? <Crown className="w-8 h-8 text-neo-dark" /> : <Zap className="w-8 h-8 text-neo-dark" />}
          </div>
          <div>
            <div className="font-black font-display text-2xl uppercase text-neo-dark">{tier === 'ultra' ? 'Ultra' : 'Free'} Tier</div>
            <div className="text-sm font-bold text-neo-dark/80">{tier === 'ultra' ? 'Unlimited everything' : '2 keys, 30 req/min'}</div>
          </div>
        </div>
        {tier === 'free' && (
          <button className="mt-6 w-full py-4 bg-neo-pink text-white border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all shadow-neo-sm cursor-pointer">
            Upgrade to Ultra — $2/month
          </button>
        )}
      </div>
      
      <div className="bg-neo-cyan border-3 border-neo-dark shadow-neo-md p-6">
        <h3 className="text-2xl font-black font-display uppercase mb-4 text-neo-dark">Proxy Settings</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold font-display uppercase text-neo-dark">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-32 bg-white border-3 border-neo-dark shadow-neo-sm px-4 py-3 font-bold font-mono text-neo-dark focus:outline-none focus:bg-neo-yellow transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
