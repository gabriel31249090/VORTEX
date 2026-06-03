'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || '')
        setBio(data.bio || '')
        setUsername(data.username || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')

    const { error: err } = await supabase.from('profiles').update({
      display_name: displayName,
      bio,
    }).eq('id', user.id)

    if (err) {
      setError(err.message)
    } else {
      setSuccess('Perfil atualizado!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  async function handleDeleteAccount() {
    if (!confirm('Tem certeza? Essa ação é irreversível!')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  const section = (title: string) => (
    <h2 style={{ color: '#8888aa', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 32 }}>
      {title}
    </h2>
  )

  const inputStyle: any = {
    width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
    outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Configurações</h1>
        <p style={{ color: '#555577', fontSize: 14 }}>Gerencie sua conta e preferências</p>

        {/* Perfil */}
        {section('Perfil')}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Username</label>
            <input value={username} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            <p style={{ color: '#333355', fontSize: 12, marginTop: 4 }}>Username não pode ser alterado</p>
          </div>
          <div>
            <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Nome de exibição</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>
          <div>
            <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Fale sobre você..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          {error && <p style={{ color: '#ff4466', fontSize: 13 }}>{error}</p>}
          {success && <p style={{ color: '#c8f23c', fontSize: 13 }}>{success}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 14, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 12px rgba(200,242,60,0.3)', opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* Conta */}
        {section('Conta')}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600 }}>Email</p>
              <p style={{ color: '#555577', fontSize: 13 }}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Zona de perigo */}
        {section('Zona de perigo')}
        <div style={{ background: 'rgba(255,50,50,0.05)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 16, padding: 20 }}>
          <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sair da conta</p>
          <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 16 }}>Você será desconectado de todos os dispositivos.</p>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/login') }}
            style={{
              background: 'transparent', border: '1px solid rgba(255,50,50,0.4)',
              color: '#ff4466', padding: '8px 18px', borderRadius: 50, cursor: 'pointer',
              fontSize: 13, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,50,50,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Sair
          </button>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}
