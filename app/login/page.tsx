'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
    } else {
      router.push('/feed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px', fontFamily: "'Syne', sans-serif"
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,242,60,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 36, fontWeight: 800, color: '#c8f23c', letterSpacing: '-1px',
            textShadow: '0 0 30px rgba(200,242,60,0.6), 0 0 60px rgba(200,242,60,0.3)'
          }}>
            ◈ VORTEX
          </div>
          <p style={{ color: '#555577', marginTop: 8, fontSize: 14 }}>Bem-vindo de volta</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 32
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 8 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '12px 16px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 8 }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '12px 16px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {error && (
            <p style={{ color: '#ff4466', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 15, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 20px rgba(200,242,60,0.3)',
              transition: 'all 0.2s', opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 30px rgba(200,242,60,0.6), 0 0 60px rgba(200,242,60,0.2)' }}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.3)')}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p style={{ textAlign: 'center', color: '#555577', fontSize: 13, marginTop: 20 }}>
            Não tem conta?{' '}
            <Link href="/register" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #333355; }
      `}</style>
    </div>
  )
}