import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://t.keyking.ledgion.in',
    ui_host: 'https://us.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*", 
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PostHogProvider>
  </React.StrictMode>,
)
