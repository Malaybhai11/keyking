import { useState } from 'react'
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
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-4xl font-black font-display tracking-tight text-neo-dark mb-2 uppercase">Anomalies</h2>
        <p className="text-neo-dark/80 font-bold text-sm">Monitor network irregularities and suspicious requests.</p>
      </div>
      
      {anomalies.length === 0 && (
        <div className="bg-neo-green border-3 border-neo-dark shadow-neo-md text-center py-16">
          <AlertTriangle className="w-16 h-16 text-neo-dark mx-auto mb-4" />
          <p className="text-neo-dark font-black font-display uppercase text-xl">No anomalies detected</p>
        </div>
      )}

      <div className="space-y-4">
        {anomalies.map(anomaly => (
          <div key={anomaly.id} className="bg-white border-3 border-neo-dark shadow-neo-sm p-4 flex items-center justify-between hover:-translate-y-1 hover:shadow-neo-md transition-all">
            <div>
              <span className="px-3 py-1 bg-neo-pink border-2 border-neo-dark text-white font-display font-black uppercase text-xs">{anomaly.type}</span>
              <p className="text-sm font-bold text-neo-dark/80 mt-2">{new Date(anomaly.detectedAt).toLocaleString()}</p>
            </div>
            {!anomaly.resolved && (
              <button onClick={() => resolveAnomaly(anomaly.id)} className="p-3 bg-neo-green border-3 border-neo-dark text-neo-dark hover:bg-neo-yellow transition-all cursor-pointer">
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
