import React, { useState } from 'react'
import { Filter, Trash2 } from 'lucide-react'

interface RoutingEvent {
  id: string
  timestamp: number
  provider: string
  latencyMs: number
  tokensUsed: number
  success: boolean
}

export default function RoutingLogPage() {
  const [events, setEvents] = useState<RoutingEvent[]>([])
  const [filter, setFilter] = useState('')

  const clearEvents = () => setEvents([])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Routing Log</h2>
        <button onClick={clearEvents} className="flex items-center gap-2 px-4 py-2 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/20 transition">
          <Trash2 className="w-4 h-4" />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by provider..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#1f1f1f] border border-gray-700 rounded-lg px-3 py-2 flex-1"
        />
      </div>

      <div className="keyking-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm">
              <th className="pb-3">Time</th>
              <th className="pb-3">Provider</th>
              <th className="pb-3">Latency</th>
              <th className="pb-3">Tokens</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No routing events yet. Make a request through the proxy to see it here.
                </td>
              </tr>
            )}
            {events.map(event => (
              <tr key={event.id} className="border-t border-[#1f1f1f]">
                <td className="py-3 font-mono text-xs">{new Date(event.timestamp).toLocaleTimeString()}</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-[#1f1f1f] rounded text-sm">{event.provider}</span>
                </td>
                <td className="py-3 font-mono">{event.latencyMs}ms</td>
                <td className="py-3">{event.tokensUsed}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
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
