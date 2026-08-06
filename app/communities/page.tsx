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
  is_private: boolean
  owner_id: string
  created_at: string
  member_count?: number
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([])
  const [myCommunities, setMyCommunities] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrivate, setNewPrivate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: commData } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })

      if (commData) {
        // busca contagem de membros pra cada comunidade
        const withCounts = await Promise.all(commData.map(async (c) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', c.id)
          return { ...c, member_count: count || 0 }
        }))
        setCommunities(withCounts)
      }

      const { data: memberData } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)

      if (memberData) setMyCommunities(new Set(memberData.map((m: { community_id: string }) => m.community_id)))

      setLoading(false)
    }
    load()
  }, [])

  async function handleJoin(community: Community, e: React.MouseEvent) {
    e.stopPropagation()
    if (!userId) return
    const isMember = myCommunities.has(community.id)

    if (isMember) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('user_id', userId)
      setMyCommunities(prev => { const next = new Set(prev); next.delete(community.id); return next })
      setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, member_count: (c.member_count || 1) - 1 } : c))
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: userId, role: 'member' })
      setMyCommunities(prev => new Set(prev).add(community.id))
      setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, member_count: (c.member_count || 0) + 1 } : c))
    }
  }

  async function handleCreate() {
    if (!userId || !newName.trim()) return
    setSubmitting(true)
    setCreateError('')

    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: existing } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (existing) { setCreateError('Já existe uma comunidade com esse nome.'); setSubmitting(false); return }

    const { data, error } = await supabase.from('communities').insert({
      name: newName.trim(),
      slug,
      description: newDesc.trim() || null,
      is_private: newPrivate,
      owner_id: userId,
    }).select().single()

    if (error || !data) { setCreateError('Erro ao criar comunidade.'); setSubmitting(false); return }

    await supabase.from('community_members').insert({ community_id: data.id, user_id: userId, role: 'owner' })

    setSubmitting(false)
    setCreating(false)
    setNewName('')
    setNewDesc('')
    setNewPrivate(false)
    router.push(`/community/${slug}`)
  }

  const filtered = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const joined = filtered.filter(c => myCommunities.has(c.id))
  const discover = filtered.filter(c => !myCommunities.has(c.id))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #c8f23c', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#555577', fontSize: 14 }}>Carregando comunidades...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{
        maxWidth: 780, margin: '0 auto',
        padding: '32px 24px 80px',
        paddingLeft: 'max(24px, calc(220px + 32px))',
      }} className="communities-main">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 26, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            ⊞ Comunidades
          </h1>
          <p style={{ color: '#555577', fontSize: 14, margin: 0 }}>
            Encontre e participe de comunidades ou crie a sua.
          </p>
        </div>

        {/* Search + criar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555577', fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar comunidades..."
              style={{
                width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '11px 14px 11px 36px',
                color: '#f0f0f8', fontSize: 14, fontFamily: "'Syne', sans-serif",
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.35)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              background: '#c8f23c', color: '#000', border: 'none',
              borderRadius: 12, padding: '11px 20px', cursor: 'pointer',
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
              boxShadow: '0 0 14px rgba(200,242,60,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 22px rgba(200,242,60,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 14px rgba(200,242,60,0.3)')}
          >
            + Criar
          </button>
        </div>

        {/* Minhas comunidades */}
        {joined.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <p style={{ color: '#555577', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Participando
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {joined.map(c => <CommunityCard key={c.id} community={c} isMember onJoin={handleJoin} onClick={() => router.push(`/community/${c.slug}`)} />)}
            </div>
          </section>
        )}

        {/* Descobrir */}
        {discover.length > 0 && (
          <section>
            <p style={{ color: '#555577', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {joined.length > 0 ? 'Descobrir' : 'Todas as comunidades'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {discover.map(c => <CommunityCard key={c.id} community={c} isMember={false} onJoin={handleJoin} onClick={() => router.push(`/community/${c.slug}`)} />)}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⊞</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#555577' }}>Nenhuma comunidade encontrada.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Que tal criar uma?</p>
          </div>
        )}
      </main>

      {/* Modal criar comunidade */}
      {creating && (
        <>
          <div
            onClick={() => { setCreating(false); setCreateError('') }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease' }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#111118', border: '1px solid rgba(200,242,60,0.15)',
            borderRadius: 20, padding: 28, width: '90%', maxWidth: 440,
            zIndex: 201, animation: 'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            fontFamily: "'Syne', sans-serif",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 18, margin: 0 }}>Nova comunidade</h2>
              <button
                onClick={() => { setCreating(false); setCreateError('') }}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nome *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: programacao, filmes-br..."
                  maxLength={40}
                  style={{
                    width: '100%', background: '#0d0d12', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                    fontFamily: "'Syne', sans-serif", outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.35)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                {newName && (
                  <p style={{ color: '#555577', fontSize: 11, marginTop: 4 }}>
                    v/{newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                  </p>
                )}
              </div>

              <div>
                <label style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Descrição</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Sobre o que é essa comunidade?"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%', background: '#0d0d12', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                    fontFamily: "'Syne', sans-serif", outline: 'none', resize: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.35)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>

              <div
                onClick={() => setNewPrivate(!newPrivate)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  background: '#0d0d12', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '10px 14px',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, border: `2px solid ${newPrivate ? '#c8f23c' : 'rgba(255,255,255,0.2)'}`,
                  background: newPrivate ? '#c8f23c' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                }}>
                  {newPrivate && <span style={{ color: '#000', fontSize: 11, fontWeight: 800 }}>✓</span>}
                </div>
                <div>
                  <p style={{ color: '#f0f0f8', fontSize: 13, fontWeight: 600, margin: 0 }}>Comunidade privada</p>
                  <p style={{ color: '#555577', fontSize: 11, margin: 0 }}>Apenas membros aprovados podem ver o conteúdo</p>
                </div>
              </div>

              {createError && (
                <p style={{ color: '#ff6060', fontSize: 13, background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
                  {createError}
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={!newName.trim() || submitting}
                style={{
                  background: !newName.trim() || submitting ? 'rgba(200,242,60,0.3)' : '#c8f23c',
                  color: '#000', border: 'none', borderRadius: 50, padding: '12px 0',
                  cursor: !newName.trim() || submitting ? 'not-allowed' : 'pointer',
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                  boxShadow: !newName.trim() || submitting ? 'none' : '0 0 14px rgba(200,242,60,0.3)',
                  transition: 'all 0.2s', marginTop: 4,
                }}
              >
                {submitting ? 'Criando...' : 'Criar comunidade'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: translate(-50%,-48%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
        @media (max-width: 767px) {
          .communities-main { padding-left: 24px !important; }
        }
      `}</style>
    </div>
  )
}

function CommunityCard({ community, isMember, onJoin, onClick }: {
  community: Community
  isMember: boolean
  onJoin: (c: Community, e: React.MouseEvent) => void
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#111118', border: `1px solid ${isMember ? 'rgba(200,242,60,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'
        e.currentTarget.style.background = '#13131c'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isMember ? 'rgba(200,242,60,0.12)' : 'rgba(255,255,255,0.06)'
        e.currentTarget.style.background = '#111118'
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#000', fontWeight: 800, fontSize: 20,
        boxShadow: isMember ? '0 0 10px rgba(200,242,60,0.2)' : 'none',
      }}>
        {community.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, margin: 0 }}>v/{community.name}</p>
          {community.is_private && (
            <span style={{ color: '#8888aa', fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.08)' }}>🔒</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>
            {community.member_count} {community.member_count === 1 ? 'membro' : 'membros'}
          </p>
          {community.description && (
            <>
              <span style={{ color: '#333355', fontSize: 12 }}>·</span>
              <p style={{ color: '#555577', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {community.description}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Botão */}
      <button
        onClick={e => onJoin(community, e)}
        style={{
          background: isMember ? 'transparent' : '#c8f23c',
          color: isMember ? '#c8f23c' : '#000',
          border: `1.5px solid ${isMember ? 'rgba(200,242,60,0.3)' : 'transparent'}`,
          borderRadius: 50, padding: '6px 16px', cursor: 'pointer',
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
          transition: 'all 0.2s', flexShrink: 0,
          boxShadow: isMember ? 'none' : '0 0 10px rgba(200,242,60,0.2)',
        }}
        onMouseEnter={e => {
          if (isMember) { e.currentTarget.style.background = 'rgba(255,60,60,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.3)'; e.currentTarget.style.color = '#ff6060' }
        }}
        onMouseLeave={e => {
          if (isMember) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' }
        }}
      >
        {isMember ? 'Sair' : '+ Entrar'}
      </button>
    </div>
  )
}