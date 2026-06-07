import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getVersion } from '@tauri-apps/api/app'
import { Key, LayoutDashboard, Activity, ShieldAlert, Settings, Terminal, LogIn, GripVertical } from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import RoutingLogPage from './pages/RoutingLogPage'
import SettingsPage from './pages/SettingsPage'
import AnomaliesPage from './pages/AnomaliesPage'
import RoutingRulesPage from './pages/RoutingRulesPage'
import { usePostHog } from 'posthog-js/react'
import { TourProvider } from './contexts/TourContext'
import TourOverlay from './components/TourOverlay'

export interface RoutingEvent {
  id: string
  timestamp: number
  provider: string
  latency_ms: number
  tokens_used: number
  success: boolean
  error_msg?: string
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
        <NavLink to="/" data-tour="tour-step-0" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <LayoutDashboard className="w-5 h-5" /> Dashboard
        </NavLink>
        <NavLink to="/keys" data-tour="tour-step-1" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <Key className="w-5 h-5" /> API Keys
        </NavLink>
        <NavLink to="/routing-log" data-tour="tour-step-7" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <Activity className="w-5 h-5" /> Routing Log
        </NavLink>
        <NavLink to="/priority" data-tour="tour-step-5" className={({isActive}) =>
          `flex items-center gap-3 px-4 py-3 border-3 transition-all duration-200 ${isActive ? 'bg-neo-yellow border-neo-dark shadow-neo-sm translate-x-[-2px] translate-y-[-2px] text-neo-dark' : 'bg-transparent border-transparent text-neo-dark hover:bg-white hover:border-neo-dark hover:shadow-neo-sm'}`
        }>
          <GripVertical className="w-5 h-5" /> Priority
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
          <button onClick={async () => {
              localStorage.removeItem('auth_session')
              try { await invoke('clear_session') } catch (e) { console.error(e) }
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
  const [session, setSession] = useState<{session_id: string, user_id: string, email?: string} | null>(() => {
    const saved = localStorage.getItem('auth_session')
    return saved ? JSON.parse(saved) : null
  })
  const [isLocked, setIsLocked] = useState<boolean | 'loading'>('loading')
  const [lockReason, setLockReason] = useState<string>('')

  const posthog = usePostHog()

  useEffect(() => {
    const unlisten = listen<{session_id: string, user_id: string, email?: string}>('auth-success', (event) => {
      setSession(event.payload)
      localStorage.setItem('auth_session', JSON.stringify(event.payload))
      invoke('save_session', { session: event.payload }).catch(console.error)
      if (posthog) {
        posthog.identify(event.payload.user_id, { email: event.payload.email || event.payload.user_id })
      }
    })
    return () => { unlisten.then(fn => fn()) }
  }, [posthog])

  useEffect(() => {
    async function init() {
      let sess = session;
      if (!sess) {
        try {
          sess = await invoke<{session_id: string, user_id: string, email?: string} | null>('get_session');
          if (sess) {
            setSession(sess);
            localStorage.setItem('auth_session', JSON.stringify(sess));
          }
        } catch (e) {
          console.error(e);
        }
      }

      try {
        const version = await getVersion();
        // Determine the API host to check against. Use local for dev, remote for prod.
        const host = import.meta.env.VITE_API_HOST || 'https://keyking.ledgion.in';
        const res = await fetch(`${host}/api/check-version`, {
          headers: {
            'x-app-version': version,
            'x-user-email': sess?.email || sess?.user_id || 'anonymous_desktop'
          }
        });
        const data = await res.json();
        if (!data.allowed) {
          setIsLocked(true);
          setLockReason(data.reason || 'Upgrade Required');
          if (posthog) posthog.reset();
          localStorage.removeItem('auth_session');
          await invoke('clear_session').catch(console.error);
          setSession(null);
          return;
        }
        
        await invoke('update_lease');
        setIsLocked(false);
      } catch (e) {
        // Offline fallback
        try {
          const isLeaseValid = await invoke<boolean>('check_lease');
          if (!isLeaseValid) {
            setIsLocked(true);
            setLockReason('Please connect to the internet once to verify your app status.');
            return;
          }
          setIsLocked(false);
        } catch(err) {
          setIsLocked(false);
        }
      }
    }
    
    init();
  }, []) // run once on mount

  useEffect(() => {
    if (session && posthog) {
      posthog.identify(session.user_id, { email: session.email || session.user_id })
    }
  }, [session, posthog])

  if (isLocked === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neo-bg text-neo-dark font-body">
        <div className="w-12 h-12 border-4 border-neo-dark border-t-neo-pink rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isLocked === true) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neo-bg text-neo-dark font-body">
        <div className="p-10 bg-white border-6 border-neo-dark shadow-neo-xl flex flex-col items-center max-w-sm text-center">
          <div className="w-20 h-20 bg-neo-pink flex items-center justify-center border-3 border-neo-dark shadow-neo-sm mb-6">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black font-display tracking-tight uppercase mb-4 text-[#ff2a85]">Action Required</h1>
          <p className="text-sm font-bold text-neo-dark/90 mb-8 px-2">{lockReason}</p>
          <button
            onClick={() => invoke('open_browser', { url: "https://keyking.ledgion.in/download" })}
            className="flex items-center gap-2 bg-neo-yellow text-neo-dark px-6 py-4 border-3 border-neo-dark font-display font-black uppercase hover:-translate-y-1 hover:shadow-neo-md transition-all w-full justify-center cursor-pointer"
          >
            Get Latest Version
          </button>
        </div>
      </div>
    )
  }

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
            onClick={() => invoke('open_browser', { url: "https://keyking.ledgion.in/auth/app-login" })}
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
      <TourProvider>
        <div className="flex h-screen bg-neo-bg text-neo-dark font-body selection:bg-neo-yellow selection:text-neo-dark">
          <Sidebar />
          <main className="flex-1 p-8 overflow-auto relative">
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/keys" element={<KeysPage />} />
                <Route path="/routing-log" element={<RoutingLogPage />} />
                <Route path="/priority" element={<RoutingRulesPage />} />
                <Route path="/anomalies" element={<AnomaliesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
          </main>
          <TourOverlay />
        </div>
      </TourProvider>
    </EventProvider>
  )
}

export default App
