'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { fadeInUp, shakeError } from '@/lib/animations'

const ScrambleText = dynamic(() => import('../components/ScrambleText'), { ssr: false })

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const cardRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) fadeInUp(cardRef.current, { duration: 500 })
  }, [])

  useEffect(() => {
    if (error && cardRef.current) shakeError(cardRef.current)
  }, [error])

  useEffect(() => {
    if (success && successRef.current) fadeInUp(successRef.current, { duration: 500 })
  }, [success])

  async function handleRegister() {
    setLoading(true)
    setError('')

    if (!aceitouTermos) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.')
      setLoading(false)
      return
    }

    if (username.length < 3) {
      setError('Username deve ter pelo menos 3 caracteres.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('profiles').select('username').eq('username', username).single()

    if (existing) {
      setError('Este username já está em uso.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { username, display_name: username } }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id, username, display_name: username,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Syne', sans-serif"
      }}>
        <div ref={successRef} style={{ textAlign: 'center', opacity: 0 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: '#f0f0f8', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Conta criada!</h2>
          <p style={{ color: '#8888aa', marginBottom: 24 }}>Verifique seu email para confirmar a conta.</p>
          <Link href="/login" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
            Ir para o login →
          </Link>
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px', fontFamily: "'Syne', sans-serif"
    }}>
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,242,60,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ filter: 'drop-shadow(0 0 20px rgba(200,242,60,0.6))' }}>
            <ScrambleText
              text="◈ VORTEX"
              as="div"
              trigger="inView"
              duration={1.2}
              color="#c8f23c"
              glitchColor="#f0f0f8"
              className="vtx-register-logo"
            />
          </div>
          <p style={{ color: '#555577', marginTop: 8, fontSize: 14 }}>Crie sua conta</p>
        </div>

        <div ref={cardRef} style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 32, opacity: 0
        }}>
          {[
            { label: 'Username', value: username, type: 'text', placeholder: 'seunome', onChange: (v: string) => setUsername(v.toLowerCase().replace(/\s/g, '')) },
            { label: 'Email', value: email, type: 'email', placeholder: 'seu@email.com', onChange: setEmail },
            { label: 'Senha', value: password, type: 'password', placeholder: '••••••••', onChange: setPassword },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: 20 }}>
              <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 8 }}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
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
          ))}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20 }}>
            <input
              type="checkbox"
              id="aceite-termos"
              checked={aceitouTermos}
              onChange={e => setAceitouTermos(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#c8f23c', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="aceite-termos" style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link href="/privacidade" target="_blank" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
                Política de Privacidade
              </Link>
            </label>
          </div>

          {error && (
            <p style={{ color: '#ff4466', fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}

          <button
            onClick={handleRegister}
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
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p style={{ textAlign: 'center', color: '#555577', fontSize: 13, marginTop: 20 }}>
            Já tem conta?{' '}
            <Link href="/login" style={{ color: '#c8f23c', textDecoration: 'none', fontWeight: 600 }}>
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #333355; }
        .vtx-register-logo {
          font-family: 'Syne', sans-serif;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -1px;
        }
      `}</style>
    </div>
  )
}