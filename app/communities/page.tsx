'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  is_private: boolean
  created_at: string
  owner_id: string
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })

      setCommunities(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setCreating(true)
    setError('')

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: existing } = await supabase
      .from('communities').select('slug').eq('slug', slug).maybeSingle()

    if (existing) { setError('Já existe uma comunidade com esse nome.'); setCreating(false); return }

    const { data, error: err } = await supabase.from('communities').insert({
      name: name.trim(), slug, description: description.trim() || null,
      is_private: isPrivate, owner_id: userId
    }).select().single()

    if (err) { setError(err.message); setCreating(false); return }

    if (data) {
      await supabase.from('community_members').insert({
        user_id: userId, community_id: data.id, role: 'owner'
      })
      setCommunities(prev => [data, ...prev])
    }

    setName('')
    setDescription('')
    setShowForm(false)
    setCreating(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24 }}>Comunidades</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 12px rgba(200,242,60,0.4)', transition: 'all 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(200,242,60,0.4)')}
          >
            + Criar
          </button>
        </div>

        {showForm && (
          <div style={{
            background: '#111118', border: '1px solid rgba(200,242,60,0.2)',
            borderRadius: 16, padding: 20, marginBottom: 24,
            boxShadow: '0 0 20px rgba(200,242,60,0.05)'
          }}>
            <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Nova comunidade</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: tecnologia"
                style={{
                  width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                  outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#8888aa', fontSize: 13, display: 'block', marginBottom: 6 }}>Descrição</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Sobre o que é essa comunidade?"
                rows={3}
                style={{
                  width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                  outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                id="private"
                style={{ accentColor: '#c8f23c', width: 16, height: 16 }}
              />
              <label htmlFor="private" style={{ color: '#8888aa', fontSize: 14, cursor: 'pointer' }}>
                Comunidade privada
              </label>
            </div>

            {error && <p style={{ color: '#ff4466', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8888aa', padding: '8px 16px', borderRadius: 50, cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background: '#c8f23c', color: '#000', fontWeight: 700,
                  padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif",
                  boxShadow: '0 0 12px rgba(200,242,60,0.3)', opacity: creating ? 0.6 : 1
                }}
              >
                {creating ? 'Criando...' : 'Criar comunidade'}
              </button>
            </div>
          </div>
        )}

        {loading && [1,2,3].map(i => (
          <div key={i} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, opacity: 0.5 }}>
            <div style={{ height: 16, background: '#222230', borderRadius: 6, width: '40%', marginBottom: 8 }} />
            <div style={{ height: 12, background: '#222230', borderRadius: 6, width: '70%' }} />
          </div>
        ))}

        {!loading && communities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⊞</div>
            <p>Nenhuma comunidade ainda. Crie a primeira!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {communities.map(community => (
            <div
              key={community.id}
              onClick={() => router.push(`/community/${community.slug}`)}
              style={{
                background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: 18, flexShrink: 0,
                  boxShadow: '0 0 10px rgba(200,242,60,0.2)'
                }}>
                  {community.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>v/{community.name}</h2>
                    {community.is_private && (
                      <span style={{ background: 'rgba(255,255,255,0.08)', color: '#8888aa', fontSize: 11, padding: '2px 8px', borderRadius: 50 }}>
                        privada
                      </span>
                    )}
                  </div>
                  {community.description && (
                    <p style={{ color: '#8888aa', fontSize: 13, marginTop: 4 }}>{community.description}</p>
                  )}
                </div>
                <span style={{ color: '#333355', fontSize: 18 }}>→</span>
              </div>
            </div>
          ))}
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