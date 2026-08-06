'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'

function SettingsSkeleton() {
  const block = (w: string, h: number) => (
    <div style={{ height: h, width: w, background: '#1a1a28', borderRadius: 8 }} />
  )
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />
      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <div style={{ marginBottom: 4 }}>{block('180px', 26)}</div>
        <div style={{ marginTop: 8, marginBottom: 32 }}>{block('240px', 14)}</div>

        <div style={{ marginBottom: 12 }}>{block('140px', 12)}</div>
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
          overflow: 'hidden', animation: 'pulse 1.5s ease infinite',
        }}>
          <div style={{ height: 100, background: '#161620' }} />
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a1a28', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{block('60%', 14)}</div>
          </div>
        </div>

        <div style={{ marginTop: 32, marginBottom: 12 }}>{block('80px', 12)}</div>
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
          padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
          animation: 'pulse 1.5s ease infinite',
        }}>
          {block('100%', 40)}
          {block('100%', 40)}
          {block('100%', 70)}
          {block('100%', 40)}
        </div>
      </main>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @media (max-width: 767px) { main { padding-left: 16px !important; } }`}</style>
    </div>
  )
}

type SettingsUser = { id: string; email?: string }
type SettingsProfile = { display_name: string | null; bio: string | null; avatar_url: string | null; banner_url: string | null }

export default function SettingsPage() {
  const [user, setUser] = useState<SettingsUser | null>(null)
  const [profile, setProfile] = useState<SettingsProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Avatar deve ter no máximo 5MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Banner deve ter no máximo 5MB'); return }
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setError('')
  }

  async function uploadImage(file: File, bucket: string, userId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/photo.${ext}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })

    if (error) { console.error(error); return null }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')

    let avatar_url = profile?.avatar_url ?? null
    let banner_url = profile?.banner_url ?? null

    if (avatarFile) {
      const url = await uploadImage(avatarFile, 'avatars', user.id)
      if (url) avatar_url = url
      else { setError('Erro ao enviar avatar.'); setSaving(false); return }
    }

    if (bannerFile) {
      const url = await uploadImage(bannerFile, 'banners', user.id)
      if (url) banner_url = url
      else { setError('Erro ao enviar banner.'); setSaving(false); return }
    }

    const { error: err } = await supabase.from('profiles').update({
      display_name: displayName,
      bio,
      avatar_url,
      banner_url,
    }).eq('id', user.id)

    if (err) {
      setError(err.message)
    } else {
      setProfile((prev: SettingsProfile | null) => ({ ...prev, display_name: displayName, bio, avatar_url, banner_url }))
      setAvatarFile(null)
      setBannerFile(null)
      setAvatarPreview(null)
      setBannerPreview(null)
      setSuccess('Perfil atualizado!')
      setTimeout(() => setSuccess(''), 3000)
    }
    setSaving(false)
  }

  if (loading) return <SettingsSkeleton />

  const currentAvatar = avatarPreview || profile?.avatar_url
  const currentBanner = bannerPreview || profile?.banner_url

  const section = (title: string) => (
    <h2 style={{ color: '#8888aa', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, marginTop: 32 }}>
      {title}
    </h2>
  )

  const inputStyle: CSSProperties = {
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

        {section('Imagens do perfil')}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 4 }}>

          <div
            onClick={() => bannerInputRef.current?.click()}
            style={{
              height: 100, position: 'relative', cursor: 'pointer', overflow: 'hidden',
              background: currentBanner
                ? 'none'
                : 'linear-gradient(135deg, rgba(200,242,60,0.1), rgba(200,242,60,0.03))',
            }}
          >
            {currentBanner && (
              <img src={currentBanner} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>🖼️</span>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {bannerFile ? '✓ Banner selecionado' : 'Alterar banner'}
              </span>
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerChange} />
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                background: currentAvatar ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 24,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                border: '3px solid #111118',
                boxShadow: avatarFile ? '0 0 0 2px #c8f23c' : '0 0 16px rgba(200,242,60,0.2)',
              }}
            >
              {currentAvatar ? (
                <img src={currentAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                username.charAt(0).toUpperCase()
              )}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 18 }}>📷</span>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            <div>
              <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                {avatarFile ? `✓ ${avatarFile.name}` : 'Clique no avatar para alterar'}
              </p>
              <p style={{ color: '#555577', fontSize: 12 }}>JPG, PNG ou WebP • Máx. 5MB</p>
            </div>
          </div>
        </div>

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
          {success && <p style={{ color: '#c8f23c', fontSize: 13 }}>✓ {success}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '10px', borderRadius: 10, border: 'none', cursor: saving ? 'wait' : 'pointer',
              fontSize: 14, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 12px rgba(200,242,60,0.3)', opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {section('Conta')}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600 }}>Email</p>
              <p style={{ color: '#555577', fontSize: 13 }}>{user?.email}</p>
            </div>
          </div>
          <div
            onClick={() => router.push('/settings/blocked')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 600 }}>🚫 Usuários bloqueados</p>
              <p style={{ color: '#555577', fontSize: 13 }}>Gerencie quem você bloqueou</p>
            </div>
            <span style={{ color: '#555577', fontSize: 16 }}>→</span>
          </div>
        </div>

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