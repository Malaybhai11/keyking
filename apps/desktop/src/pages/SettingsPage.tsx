import { useState } from 'react'
import { Crown, Zap } from 'lucide-react'

export default function SettingsPage() {
  const [tier] = useState<'free' | 'ultra'>('free')
  const [port, setPort] = useState(8787)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="keyking-card">
        <h3 className="text-lg font-semibold mb-4">Account</h3>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${tier === 'ultra' ? 'bg-white/10' : 'bg-white/5'}`}>
            {tier === 'ultra' ? <Crown className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <div className="font-bold">{tier === 'ultra' ? 'Ultra' : 'Free'} Tier</div>
            <div className="text-sm text-gray-400">{tier === 'ultra' ? 'Unlimited everything' : '2 keys, 30 req/min'}</div>
          </div>
        </div>
        {tier === 'free' && (
          <button className="mt-4 w-full py-2 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition shadow-sm">
            Upgrade to Ultra — $2/month
          </button>
        )}
      </div>
      
      <div className="keyking-card">
        <h3 className="text-lg font-semibold mb-4">Proxy Settings</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="w-24 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/30"
          />
        </div>
      </div>
    </div>
  )
}
