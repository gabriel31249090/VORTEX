'use client'

import { createClient } from '@/lib/supabase'

export default function OAuthButtons() {
  const supabase = createClient()

  async function entrarCom(provider: 'github' | 'google') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
      <button
        onClick={() => entrarCom('github')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#18181f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f8',
          fontWeight: 600, padding: '11px', borderRadius: 12, cursor: 'pointer',
          fontSize: 14, fontFamily: "'Syne', sans-serif", transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
        Continuar com GitHub
      </button>

      <button
        onClick={() => entrarCom('google')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#18181f', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f8',
          fontWeight: 600, padding: '11px', borderRadius: 12, cursor: 'pointer',
          fontSize: 14, fontFamily: "'Syne', sans-serif", transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.56-5.17 3.56-8.66Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.87-3a7.4 7.4 0 0 1-11-3.9H1.08v3.09A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.07 14.2a7.2 7.2 0 0 1 0-4.4V6.71H1.08a12 12 0 0 0 0 10.58l3.99-3.09Z" />
          <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.08 6.71l3.99 3.09A7.15 7.15 0 0 1 12 4.75Z" />
        </svg>
        Continuar com Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ color: '#555577', fontSize: 12 }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>
  )
}
