import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import KeysPage from './pages/KeysPage'
import RoutingLogPage from './pages/RoutingLogPage'
import SettingsPage from './pages/SettingsPage'
import AnomaliesPage from './pages/AnomaliesPage'

function App() {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-[240px] border-r border-[#1f1f1f] flex flex-col">
        <div className="p-4 border-b border-[#1f1f1f]">
          <h1 className="text-xl font-bold keyking-accent">Key King</h1>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          <NavLink to="/" className={({isActive}) => 
            \`block px-3 py-2 rounded-md text-sm \${isActive ? 'bg-[#1f1f1f] text-[#f59e0b]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'}
          \`}>
            Dashboard
          </NavLink>
          <NavLink to="/keys" className={({isActive}) => 
            \`block px-3 py-2 rounded-md text-sm \${isActive ? 'bg-[#1f1f1f] text-[#f59e0b]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'}
          \`}>
            Keys
          </NavLink>
          <NavLink to="/routing-log" className={({isActive}) => 
            \`block px-3 py-2 rounded-md text-sm \${isActive ? 'bg-[#1f1f1f] text-[#f59e0b]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'}
          \`}>
            Routing Log
          </NavLink>
          <NavLink to="/anomalies" className={({isActive}) => 
            \`block px-3 py-2 rounded-md text-sm \${isActive ? 'bg-[#1f1f1f] text-[#f59e0b]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'}
          \`}>
            Anomalies
          </NavLink>
          <NavLink to="/settings" className={({isActive}) => 
            \`block px-3 py-2 rounded-md text-sm \${isActive ? 'bg-[#1f1f1f] text-[#f59e0b]' : 'text-gray-400 hover:text-white hover:bg-[#1f1f1f]'}
          \`}>
            Settings
          </NavLink>
        </nav>
        
        <div className="p-4 border-t border-[#1f1f1f] text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Proxy: localhost:8787
          </div>
          <div className="mt-1">Status: Verified</div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/routing-log" element={<RoutingLogPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
