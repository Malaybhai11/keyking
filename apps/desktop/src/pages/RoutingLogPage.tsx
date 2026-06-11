import { useState } from 'react'
import { Filter, Trash2, Activity, Clock, X, Info } from 'lucide-react'
import { useEvents, formatTokens } from '../App'

export default function RoutingLogPage() {
  const { events, clearEvents } = useEvents()
  const [filter, setFilter] = useState('')
  const [selectedError, setSelectedError] = useState<string | null>(null)

  const filtered = filter
    ? events.filter(e => e.provider.toLowerCase().includes(filter.toLowerCase()))
    : events

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black font-display tracking-tight text-neo-dark mb-2 uppercase">Routing Log</h2>
          <p className="text-neo-dark/80 font-bold text-sm">Real-time gateway traffic and latency metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-neo-cyan border-3 border-neo-dark shadow-neo-sm">
            <Activity className="w-5 h-5 text-neo-dark" />
            <span className="text-sm font-black font-display text-neo-dark uppercase tracking-wider">{events.length} events logged</span>
          </div>
          <button 
            onClick={clearEvents} 
            className="flex items-center gap-2 px-6 py-3 bg-neo-pink text-white border-3 border-neo-dark shadow-neo-sm hover:-translate-y-1 transition-all font-display font-black uppercase cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
            Clear Logs
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Filter className="w-5 h-5 text-neo-dark absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by provider..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-white border-3 border-neo-dark pl-12 pr-4 py-3 text-neo-dark font-bold placeholder:text-neo-dark/50 focus:outline-none focus:bg-neo-yellow transition-all shadow-neo-sm"
          />
        </div>
      </div>

      <div className="bg-white border-3 border-neo-dark shadow-neo-md p-0 overflow-hidden">
        <table className="w-full text-left border-collapse relative z-10">
          <thead>
            <tr className="bg-neo-yellow border-b-3 border-neo-dark text-sm font-display font-black uppercase tracking-wider text-neo-dark">
              <th className="py-4 px-6">Time</th>
              <th className="py-4 px-6">Provider</th>
              <th className="py-4 px-6">Latency</th>
              <th className="py-4 px-6">Tokens</th>
              <th className="py-4 px-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y-3 divide-neo-dark">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-neo-dark bg-neo-bg">
                  <div className="flex flex-col items-center gap-3">
                    <Clock className="w-10 h-10 text-neo-dark" />
                    <p className="font-bold">No routing events yet. Make a request through the proxy to see traffic.</p>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(event => (
              <tr key={event.id} className="hover:bg-neo-bg transition-colors">
                <td className="py-4 px-6">
                  <span className="font-mono text-sm font-bold text-neo-dark">
                    {new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1.5 bg-white border-2 border-neo-dark shadow-neo-sm text-sm font-black font-display uppercase text-neo-dark">
                    {event.provider}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="h-3 rounded-none w-16 bg-white border-2 border-neo-dark shadow-neo-sm overflow-hidden">
                      <div 
                        className={`h-full ${event.latency_ms < 500 ? 'bg-neo-green border-r-2 border-neo-dark' : event.latency_ms < 1500 ? 'bg-neo-yellow border-r-2 border-neo-dark' : 'bg-neo-pink border-r-2 border-neo-dark'}`} 
                        style={{ width: `${Math.min(100, (event.latency_ms / 2000) * 100)}%` }} 
                      />
                    </div>
                    <span className="font-mono font-bold text-sm text-neo-dark">{event.latency_ms}ms</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-neo-dark font-black text-lg">
                  {formatTokens(event.tokens_used)}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {event.error_msg && !event.success && (
                      <button
                        onClick={() => setSelectedError(event.error_msg!)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-neo-pink/10 border-2 border-neo-dark shadow-[2px_2px_0px_0px_rgba(33,37,41,1)] transition-all font-display font-black uppercase text-[10px] text-neo-dark cursor-pointer"
                      >
                        <Info className="w-3 h-3" />
                        Details
                      </button>
                    )}
                    <span className={`inline-flex items-center justify-center px-3 py-1 font-display uppercase text-xs font-black border-2 border-neo-dark shadow-neo-sm ${
                      event.success 
                        ? 'bg-neo-green text-neo-dark' 
                        : 'bg-neo-pink text-white'
                    }`}>
                      {event.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neo-dark/50 backdrop-blur-sm">
          <div className="bg-white border-4 border-neo-dark shadow-neo-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="bg-neo-pink border-b-4 border-neo-dark px-6 py-4 flex items-center justify-between">
              <h3 className="font-display font-black text-white text-xl uppercase tracking-wider">Error Details</h3>
              <button 
                onClick={() => setSelectedError(null)}
                className="p-1 hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-neo-bg">
              <div className="bg-white border-3 border-neo-dark shadow-[4px_4px_0px_0px_rgba(33,37,41,1)] p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm font-bold text-neo-dark break-all leading-relaxed">
                  {selectedError}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t-4 border-neo-dark bg-white flex justify-end">
              <button
                onClick={() => setSelectedError(null)}
                className="px-6 py-2 bg-neo-yellow border-3 border-neo-dark shadow-[4px_4px_0px_0px_rgba(33,37,41,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all font-display font-black uppercase text-sm text-neo-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
