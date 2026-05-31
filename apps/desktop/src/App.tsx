import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Key, LayoutDashboard, Activity, ShieldAlert, Settings, Terminal } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import RoutingLogPage from './pages/RoutingLogPage'
import SettingsPage from './pages/SettingsPage'
import AnomaliesPage from './pages/AnomaliesPage'

export interface RoutingEvent {
  id: string
  timestamp: number
  provider: string
  latency_ms: number
  tokens_used: number
  success: boolean
}

interface EventContextValue {
  events: RoutingEvent[]
  addEvent: (e: RoutingEvent) => void
  clearEvents: () => void
}

const EventContext = createContext<EventContextValue>({
  events: [],
  addEvent: () => {},
  clearEvents: () => {},
})

export const useEvents = () => useContext(EventContext)

function EventProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<RoutingEvent[]>([])
  const maxEvents = 200

  useEffect(() => {
    invoke<RoutingEvent[]>('list_routing_events')
      .then((history) => {
        setEvents(history.slice(0, maxEvents))
      })
      .catch((err) => {
        console.error('Failed to load routing logs:', err)
      })

    const unlisten = listen<RoutingEvent>('routing-event', (event) => {
      setEvents(prev => [event.payload, ...prev].slice(0, maxEvents))
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const addEvent = (e: RoutingEvent) => setEvents(prev => [e, ...prev].slice(0, maxEvents))
  
  const clearEvents = () => {
    invoke('clear_routing_events')
      .then(() => setEvents([]))
      .catch((err) => console.error('Failed to clear routing logs:', err))
  }

  return (
    <EventContext.Provider value={{ events, addEvent, clearEvents }}>
      {children}
    </EventContext.Provider>
  )
}

function Sidebar() {
  const { events } = useEvents()
  const recent = events.filter(e => e.success).length

  return (
    <aside className="w-[260px] bg-[#0c0c0e]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col shadow-2xl z-10 relative">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative group">
          <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Key className="w-5 h-5 text-amber-500 relative z-10" />
        </div>
        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">KeyKing</h1>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1.5">
        <NavLink to="/" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}`
        }>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </NavLink>
        <NavLink to="/keys" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}`
        }>
          <Key className="w-4 h-4" /> API Keys
        </NavLink>
        <NavLink to="/routing-log" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}`
        }>
          <Activity className="w-4 h-4" /> Routing Log
        </NavLink>
        <NavLink to="/anomalies" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}`
        }>
          <ShieldAlert className="w-4 h-4" /> Anomalies
        </NavLink>
        <NavLink to="/settings" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'}`
        }>
          <Settings className="w-4 h-4" /> Settings
        </NavLink>
      </nav>
      
      <div className="p-5 m-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50"></div>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] relative z-10" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 absolute inset-0 animate-ping opacity-75" />
          </div>
          <span className="text-xs font-semibold text-gray-200 tracking-wide uppercase">Proxy Active</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mb-3 bg-black/40 px-2 py-1 rounded-md border border-white/5">
          <Terminal className="w-3 h-3 text-gray-500" />
          localhost:8787
        </div>
        <div className="text-xs text-green-400/90 font-medium flex justify-between items-center">
          <span>{recent} requests</span>
          <span className="text-gray-600 text-[10px] uppercase">Today</span>
        </div>
      </div>
    </aside>
  )
}

function App() {
  return (
    <EventProvider>
      <div className="flex h-screen text-gray-100 font-sans selection:bg-amber-500/30 selection:text-white bg-transparent">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto relative">
          <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/keys" element={<KeysPage />} />
              <Route path="/routing-log" element={<RoutingLogPage />} />
              <Route path="/anomalies" element={<AnomaliesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </EventProvider>
  )
}

export default App
