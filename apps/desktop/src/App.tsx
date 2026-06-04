import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { Key, LayoutDashboard, Activity, ShieldAlert, Settings, Terminal, LogIn } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import RoutingLogPage from './pages/RoutingLogPage'
import SettingsPage from './pages/SettingsPage'
import AnomaliesPage from './pages/AnomaliesPage'
import { usePostHog } from 'posthog-js/react'

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
    <aside className="w-[280px] bg-neo-bg border-r-3 border-neo-dark flex flex-col z-10 relative">
      <div className="p-6 flex items-center gap-3 border-b-3 border-neo-dark bg-white">
        <div className="w-10 h-10 bg-neo-yellow flex items-center justify-center border-3 border-neo-dark shadow-neo-sm">
          <Key className="w-6 h-6 text-neo-dark" />
        </div>
        <h1 className="text-2xl font-display font-black text-neo-dark tracking-tight uppercase">KeyKing</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-3 font-display uppercase font-bold text-sm">
        <NavLink to="/" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </NavLink>
        <NavLink to="/keys" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <Key className="w-5 h-5" /> API Keys
        </NavLink>
        <NavLink to="/routing-log" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <Activity className="w-5 h-5" /> Routing Log
        </NavLink>
        <NavLink to="/anomalies" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <ShieldAlert className="w-5 h-5" /> Anomalies
        </NavLink>
        <NavLink to="/settings" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <Settings className="w-5 h-5" /> Settings
        </NavLink>
        
        <div className="pt-4">
          <button onClick={() => {
              localStorage.removeItem('auth_session')
              window.location.reload()
            }} 
            className="w-full flex items-center gap-3 px-4 py-3 border-3 border-transparent transition-all duration-200 text-neo-dark hover:bg-neo-pink hover:text-white hover:border-neo-dark hover:shadow-neo-sm cursor-pointer"
          >
            <LogIn className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </nav>
      
      <div className="p-5 m-4 bg-neo-green border-3 border-neo-dark shadow-neo-md relative overflow-hidden group">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-3 h-3 bg-white border-2 border-neo-dark relative z-10" />
            <div className="w-3 h-3 bg-white absolute inset-0 animate-ping opacity-75" />
          </div>
          <span className="text-xs font-display font-black text-neo-dark tracking-wide uppercase">Proxy Active</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neo-light font-mono mb-3 bg-neo-dark px-2 py-1.5 border border-neo-dark">
          <Terminal className="w-3 h-3 text-neo-light" />
          localhost:8787
        </div>
        <div className="text-sm text-neo-dark font-black font-display flex justify-between items-center">
          <span>{recent} REQ</span>
          <span className="text-xs uppercase bg-white border border-neo-dark px-1">Today</span>
        </div>
      </div>
    </aside>
  )
}

function App() {
  const [session, setSession] = useState<{session_id: string, user_id: string} | null>(() => {
    const saved = localStorage.getItem('auth_session')
    return saved ? JSON.parse(saved) : null
  })

  const posthog = usePostHog()

  useEffect(() => {
    const unlisten = listen<{session_id: string, user_id: string}>('auth-success', (event) => {
      setSession(event.payload)
      localStorage.setItem('auth_session', JSON.stringify(event.payload))
      if (posthog) {
        posthog.identify(event.payload.user_id)
      }
    })
    return () => { unlisten.then(fn => fn()) }
  }, [posthog])

  useEffect(() => {
    if (session && posthog) {
      posthog.identify(session.user_id)
    }
  }, [session, posthog])


  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neo-bg text-neo-dark font-body">
        <div className="p-10 bg-white border-6 border-neo-dark shadow-neo-xl flex flex-col items-center max-w-sm text-center">
          <div className="w-20 h-20 bg-neo-yellow flex items-center justify-center border-3 border-neo-dark shadow-neo-sm mb-6">
            <Key className="w-10 h-10 text-neo-dark" />
          </div>
          <h1 className="text-4xl font-black font-display tracking-tight uppercase mb-2">KeyKing</h1>
          <p className="text-sm font-medium text-neo-dark/80 mb-10">Secure your API keys with zero-trust local encryption. Please sign in to continue.</p>
          <button
            onClick={() => invoke('open_browser', { url: "http://localhost:3000/auth/app-login" })}
            className="flex items-center gap-2 bg-neo-pink text-white px-6 py-4 border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all w-full justify-center cursor-pointer"
          >
            <LogIn className="w-6 h-6" />
            Sign In with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <EventProvider>
      <div className="flex h-screen bg-neo-bg text-neo-dark font-body selection:bg-neo-yellow selection:text-neo-dark">
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
