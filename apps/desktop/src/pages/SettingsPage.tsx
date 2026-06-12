import { useState } from 'react'
import { Crown } from 'lucide-react'
import { useUpdateStore } from '../contexts/UpdateStore'

export default function SettingsPage() {

  const [port, setPort] = useState(8787)
  const { update, installUpdate, isInstalling, installProgress } = useUpdateStore()

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
        
        <div className="mt-6 bg-white border-2 border-neo-dark p-4 shadow-neo-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-neo-dark font-black font-display text-lg tracking-wide uppercase">
              Keep Ultra Access Free Forever
            </p>
            <p className="text-neo-dark/80 font-bold text-sm">
              {update ? `Version ${update.version} is available to install!` : 'You are on the latest version.'}
            </p>
          </div>
          {update && (
            <button 
              onClick={installUpdate} 
              disabled={isInstalling}
              className={`${isInstalling ? 'bg-neo-green' : 'bg-neo-pink'} text-white font-black font-display uppercase px-6 py-3 border-3 border-neo-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap cursor-pointer flex items-center gap-2`}
            >
              <Crown className="w-5 h-5" />
              {isInstalling ? `Updating... ${installProgress}%` : 'Update Now'}
            </button>
          )}
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
