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
            <Crown className="w-8 h-8 text-neo-dark" />
          </div>
          <div>
            <div className="font-black font-display text-2xl uppercase text-neo-dark">Ultra Tier</div>
            <div className="text-sm font-bold text-neo-dark/80">Unlimited everything</div>
          </div>
        </div>
        
        <div className="mt-6 bg-white border-2 border-neo-dark p-3 shadow-neo-sm">
          <p className="text-neo-dark font-bold text-sm tracking-wide">
            Enjoy! We are giving Ultra access to new users.
          </p>
        </div>
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
