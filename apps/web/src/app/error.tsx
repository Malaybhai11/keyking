'use client' // Error components must be Client Components

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  const clearCookiesAndRetry = () => {
    // Clear all cookies that might be causing the 500 error (like malformed JWTs)
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      // Expire the cookie across the entire domain
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
    
    // Sometimes cookies are set on the domain level, try to clear them as well
    const domain = window.location.hostname;
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + domain;
    }

    // Refresh the page entirely to clear Next.js client-side cache and retry
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-bg p-4 font-body">
      <div className="bg-white border-4 border-neo-dark p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 bg-neo-pink rounded-full border-4 border-neo-dark flex items-center justify-center mb-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-4xl">⚠️</span>
        </div>
        
        <div>
          <h2 className="text-2xl font-black font-display tracking-tight uppercase mb-2 text-neo-dark">
            Something went wrong!
          </h2>
          <p className="text-neo-dark/80 font-bold text-sm">
            We encountered a server error. This is often caused by an outdated or corrupted session cookie from a previous version.
          </p>
        </div>

        <button
          onClick={clearCookiesAndRetry}
          className="w-full bg-neo-yellow text-neo-dark font-black font-display uppercase tracking-wider py-4 px-6 border-3 border-neo-dark shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          Clear Cookies & Retry
        </button>
      </div>
    </div>
  )
}
