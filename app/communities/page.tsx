'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import toast from 'react-hot-toast'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  is_private: boolean
  created_at: string
  owner_id: string
  members_count?: number
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
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

      // Comunidades que o usuário é membro
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      setMemberOf(new Set(memberships?.map(m => m.community_id) || []))
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    if (!name.trim()) { toast.error('Nome obrigatório.'); return }
    setCreating(true)

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: existing } = await supabase
      .from('communities').select('slug').eq('slug', slug).maybeSingle()

    if (existing) { toast.error('Já existe uma comunidade com esse nome.'); setCreating(false); return }

    const { data, error: err } = await supabase.from('communities').insert({
      name: name.trim(), slug, description: description.trim() || null,
      is_private: isPrivate, owner_id: userId
    }).select().single()

    if (err) { toast.error(err.message); setCreating(false); return }

    if (data) {
      await supabase.from('community_members').insert({
        user_id: userId, community_id: data.id, role: 'owner'
      })
      setCommunities(prev => [data, ...prev])
      setMemberOf(prev => new Set([...prev, data.id]))
      toast.success(`Comunidade v/${data.name} criada!`)
    }

    setName('')
    setDescription('')
    setShowForm(false)
    setCreating(false)
  }

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  )

  const myComms = filtered.filter(c => memberOf.has(c.id))
  const otherComms = filtered.filter(c => !memberOf.has(c.id))

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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

        {/* Busca */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555577', fontSize: 15, pointerEvents: 'none' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar comunidades..."
            style={{
              width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '10px 14px 10px 40px', color: '#f0f0f8', fontSize: 14,
              outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Formulário de criação */}
        {showForm && (
          <div style={{
            background: '#111118', border: '1px solid rgba(200,242,60,0.2)',
            borderRadius: 16, padding: 20, marginBottom: 24,
            boxShadow: '0 0 20px rgba(200,242,60,0.05)',
            animation: 'fadeIn 0.2s ease',
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
              {name && (
                <p style={{ color: '#555577', fontSize: 12, marginTop: 6 }}>
                  slug: <span style={{ color: '#c8f23c' }}>
                    v/{name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                  </span>
                </p>
              )}
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
                type="checkbox" checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                id="private" style={{ accentColor: '#c8f23c', width: 16, height: 16 }}
              />
              <label htmlFor="private" style={{ color: '#8888aa', fontSize: 14, cursor: 'pointer' }}>
                Comunidade privada
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowForm(false); setName(''); setDescription('') }}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8888aa', padding: '8px 16px', borderRadius: 50, cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif"
                }}
              >Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  background: '#c8f23c', color: '#000', fontWeight: 700,
                  padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif",
                  boxShadow: '0 0 12px rgba(200,242,60,0.3)', opacity: creating ? 0.6 : 1
                }}
              >{creating ? 'Criando...' : 'Criar comunidade'}</button>
            </div>
          </div>
        )}

        {/* Skeletons */}
        {loading && [1, 2, 3].map(i => (
          <div key={i} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, animation: 'pulse 1.5s ease infinite' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#1a1a28', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: '#1a1a28', borderRadius: 6, width: '40%', marginBottom: 8 }} />
                <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '70%' }} />
              </div>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>⊞</div>
            <p style={{ fontSize: 14 }}>{search ? 'Nenhuma comunidade encontrada.' : 'Nenhuma comunidade ainda. Crie a primeira!'}</p>
          </div>
        )}

        {/* Minhas comunidades */}
        {!loading && myComms.length > 0 && (
          <>
            <p style={{ color: '#555577', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Minhas comunidades
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {myComms.map((community, i) => (
                <CommunityCard key={community.id} community={community} isMember={true} index={i} router={router} />
              ))}
            </div>
          </>
        )}

        {/* Outras comunidades */}
        {!loading && otherComms.length > 0 && (
          <>
            {myComms.length > 0 && (
              <p style={{ color: '#555577', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Descobrir
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {otherComms.map((community, i) => (
                <CommunityCard key={community.id} community={community} isMember={false} index={i} router={router} />
              ))}
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}

function CommunityCard({ community, isMember, index, router }: {
  community: Community
  isMember: boolean
  index: number
  router: any
}) {
  return (
    <div
      onClick={() => router.push(`/community/${community.slug}`)}
      style={{
        background: '#111118', border: `1px solid ${isMember ? 'rgba(200,242,60,0.1)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16, padding: 18, cursor: 'pointer', transition: 'all 0.2s',
        animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'
        e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isMember ? 'rgba(200,242,60,0.1)' : 'rgba(255,255,255,0.06)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(200,242,60,0.2), rgba(200,242,60,0.05))',
          border: '1px solid rgba(200,242,60,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c8f23c', fontWeight: 800, fontSize: 18,
        }}>
          {community.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>v/{community.name}</h2>
            {community.is_private && (
              <span style={{ background: 'rgba(255,255,255,0.06)', color: '#555577', fontSize: 10, padding: '2px 7px', borderRadius: 50 }}>
                privada
              </span>
            )}
            {isMember && (
              <span style={{ background: 'rgba(200,242,60,0.1)', color: '#c8f23c', fontSize: 10, padding: '2px 7px', borderRadius: 50, fontWeight: 700 }}>
                membro ✓
              </span>
            )}
          </div>
          {community.description && (
            <p style={{ color: '#8888aa', fontSize: 13, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {community.description}
            </p>
          )}
        </div>

        <span style={{ color: '#333355', fontSize: 16, flexShrink: 0 }}>→</span>
      </div>
    </div>
  )
}