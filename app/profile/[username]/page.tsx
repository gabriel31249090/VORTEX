'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  created_at: string
}

type Post = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const username = params.username as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('username', username).single()

      if (!profileData) { setLoading(false); return }

      setProfile(profileData)
      setDisplayName(profileData.display_name || '')
      setBio(profileData.bio || '')
      setIsOwner(user?.id === profileData.id)

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, likes_count, comments_count, created_at')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })

      setPosts(postsData || [])
      setLoading(false)
    }
    load()
  }, [username])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName, bio }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, display_name: displayName, bio } : prev)
    setEditMode(false)
    setSaving(false)
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Usuário não encontrado.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
          >
            ← Voltar
          </button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>@{profile.username}</span>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Perfil */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Banner */}
          <div style={{
            height: 100,
            background: 'linear-gradient(135deg, rgba(200,242,60,0.15), rgba(200,242,60,0.05))',
            borderBottom: '1px solid rgba(200,242,60,0.1)'
          }} />

          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -48, marginBottom: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 28,
                border: '4px solid #111118',
                boxShadow: '0 0 20px rgba(200,242,60,0.3)'
              }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>

              {/* Botões */}
              {isOwner && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#8888aa', padding: '7px 16px', borderRadius: 50, cursor: 'pointer',
                    fontSize: 13, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.4)'; e.currentTarget.style.color = '#c8f23c' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#8888aa' }}
                >
                  Editar perfil
                </button>
              )}
              {isOwner && editMode && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#8888aa', padding: '7px 14px', borderRadius: 50, cursor: 'pointer',
                      fontSize: 13, fontFamily: "'Syne', sans-serif"
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      background: '#c8f23c', color: '#000', fontWeight: 700,
                      padding: '7px 16px', borderRadius: 50, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontFamily: "'Syne', sans-serif",
                      boxShadow: '0 0 12px rgba(200,242,60,0.3)'
                    }}
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Nome de exibição"
                  style={{
                    background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                    outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', width: '100%'
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Bio..."
                  rows={3}
                  style={{
                    background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                    outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none', boxSizing: 'border-box', width: '100%'
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            ) : (
              <>
                <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
                  {profile.display_name || profile.username}
                </h1>
                <p style={{ color: '#555577', fontSize: 14, marginBottom: 8 }}>@{profile.username}</p>
                {profile.bio && <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}
                <p style={{ color: '#333355', fontSize: 12, marginTop: 12 }}>{posts.length} publicações</p>
              </>
            )}
          </div>
        </div>

        {/* Posts */}
        {posts.length === 0 && (
          <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '40px 0' }}>Nenhuma publicação ainda.</p>
        )}
        {posts.map(post => (
          <article
            key={post.id}
            onClick={() => router.push(`/post/${post.id}`)}
            style={{
              background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{post.title}</h2>
            {post.content && <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{post.content}</p>}
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: '#333355', fontSize: 12 }}>▲ {post.likes_count}</span>
              <span style={{ color: '#333355', fontSize: 12 }}>💬 {post.comments_count}</span>
              <span style={{ color: '#333355', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
            </div>
          </article>
        ))}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
      `}</style>
    </div>
  )
}