import React, { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'

interface Anomaly {
  id: string
  type: string
  detectedAt: number
  resolved: boolean
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])

  const resolveAnomaly = (id: string) => {
    setAnomalies(anomalies.map(a => a.id === id ? { ...a, resolved: true } : a))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Anomalies</h2>
      
      {anomalies.length === 0 && (
        <div className="keyking-card text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No anomalies detected</p>
        </div>
      )}

      <div className="space-y-2">
        {anomalies.map(anomaly => (
          <div key={anomaly.id} className="keyking-card flex items-center justify-between">
            <div>
              <span className="px-2 py-1 bg-red-900/50 text-red-400 rounded text-xs font-bold">{anomaly.type}</span>
              <p className="text-sm text-gray-400 mt-1">{new Date(anomaly.detectedAt).toLocaleString()}</p>
            </div>
            {!anomaly.resolved && (
              <button onClick={() => resolveAnomaly(anomaly.id)} className="p-2 bg-green-900/50 text-green-400 rounded-lg hover:bg-green-900 transition">
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
