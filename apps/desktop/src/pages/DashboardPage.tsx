import React from 'react'
import { Activity, Key, Zap, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    { label: 'Active Keys', value: '3', icon: Key },
    { label: 'Requests Today', value: '1,247', icon: Activity },
    { label: 'Tokens Remaining', value: '892K', icon: Zap },
    { label: 'Anomalies', value: '0', icon: AlertTriangle },
  ]

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
        <h3 className="text-lg font-semibold mb-4">Proxy Configuration</h3>
        <div className="flex items-center justify-between bg-[#1f1f1f] rounded-lg p-4 font-mono text-sm">
          <code>OPENAI_BASE_URL=http://localhost:8787/v1</code>
          <button 
            onClick={() => navigator.clipboard.writeText('OPENAI_BASE_URL=http://localhost:8787/v1')}
            className="px-3 py-1 bg-[#f59e0b] text-black rounded-md text-xs font-bold hover:bg-[#d97706] transition"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}
