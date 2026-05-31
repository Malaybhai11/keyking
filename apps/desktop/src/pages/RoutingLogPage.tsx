import { useState } from 'react'
import { Filter, Trash2, Activity, Clock } from 'lucide-react'
import { useEvents } from '../App'

export default function RoutingLogPage() {
  const { events, clearEvents } = useEvents()
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? events.filter(e => e.provider.toLowerCase().includes(filter.toLowerCase()))
    : events

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Routing Log</h2>
          <p className="text-gray-400 text-sm">Real-time gateway traffic and latency metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#050505]/80 border border-white/10 rounded-xl">
            <Activity className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-medium text-gray-300">{events.length} events logged</span>
          </div>
          <button 
            onClick={clearEvents} 
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 hover:border-rose-500/30 transition-all font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Filter className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by provider..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="keyking-card p-0 overflow-hidden border-white/10 bg-[#050505]/40 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <table className="w-full text-left border-collapse relative z-10">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/10 text-xs uppercase tracking-wider text-gray-500 font-semibold">
              <th className="py-4 px-6 font-medium">Time</th>
              <th className="py-4 px-6 font-medium">Provider</th>
              <th className="py-4 px-6 font-medium">Latency</th>
              <th className="py-4 px-6 font-medium">Tokens</th>
              <th className="py-4 px-6 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-500 bg-white/[0.01]">
                  <div className="flex flex-col items-center gap-3">
                    <Clock className="w-8 h-8 text-gray-600" />
                    <p>No routing events yet. Make a request through the proxy to see traffic.</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(event => (
              <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-4 px-6">
                  <span className="font-mono text-xs text-gray-400">
                    {new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1.5 bg-[#111] border border-white/10 rounded-lg text-sm text-gray-200 font-medium">
                    {event.provider}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 rounded-full w-12 bg-white/5 overflow-hidden`}>
                      <div 
                        className={`h-full ${event.latency_ms < 500 ? 'bg-emerald-500' : event.latency_ms < 1500 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${Math.min(100, (event.latency_ms / 2000) * 100)}%` }} 
                      />
                    </div>
                    <span className="font-mono text-sm text-gray-300">{event.latency_ms}ms</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-300 font-medium">
                  {event.tokens_used.toLocaleString()}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border ${
                    event.success 
                      ? 'bg-white/5 text-gray-300 border-white/10' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {event.success ? 'Success' : 'Failed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
