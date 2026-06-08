'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'

type Conversation = {
  id: string
  other_user: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  last_message: string | null
  last_message_at: string | null
  unread: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadConversations(user.id)
    }
    load()
  }, [])

  async function loadConversations(uid: string) {
    setLoading(true)
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', uid)

    if (!participants?.length) { setLoading(false); return }

    const convIds = participants.map(p => p.conversation_id)
    const convs: Conversation[] = []

    await Promise.all(convIds.map(async convId => {
      const [{ data: others }, { data: lastMsg }, { count }] = await Promise.all([
        supabase.from('conversation_participants')
          .select('user_id, profiles(id, username, display_name, avatar_url)')
          .eq('conversation_id', convId)
          .neq('user_id', uid),
        supabase.from('messages')
          .select('content, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('read', false)
          .neq('sender_id', uid)
      ])

      const other = others?.[0]
      if (other?.profiles) {
        convs.push({
          id: convId,
          other_user: other.profiles as any,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || null,
          unread: count || 0
        })
      }
    }))

    convs.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())
    setConversations(convs)
    setLoading(false)
  }

  async function searchUsers(q: string) {
    setSearchQuery(q)
    if (q.length < 1) { setSearchResults([]); setShowResults(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', userId || '')
      .limit(8)
    setSearchResults(data || [])
    setShowResults(true)
  }

  async function startConversation(otherUserId: string) {
    if (!userId) return
    setShowResults(false)
    setSearchQuery('')

    // Verifica se já existe conversa
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (myConvs?.length) {
      const myConvIds = myConvs.map(c => c.conversation_id)
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds)
        .maybeSingle()

      if (existing) {
        router.push(`/messages/${existing.conversation_id}`)
        return
      }
    }

    // Cria nova conversa
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single()

    if (error || !newConv) { console.error('Erro ao criar conversa:', error); return }

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId }
    ])

    router.push(`/messages/${newConv.id}`)
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  function timeAgo(date: string | null) {
    if (!date) return ''
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, marginBottom: 20 }}>Mensagens</h1>

        {/* Buscar usuário */}
        <div ref={searchRef} style={{ position: 'relative', marginBottom: 24 }}>
          <input
            value={searchQuery}
            onChange={e => searchUsers(e.target.value)}
            onFocus={e => {
              if (searchQuery.length > 0) setShowResults(true)
              e.target.style.borderColor = 'rgba(200,242,60,0.4)'
            }}
            placeholder="🔍 Buscar usuário para conversar..."
            style={{
              width: '100%', background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '12px 16px', color: '#f0f0f8', fontSize: 14,
              outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; setTimeout(() => setShowResults(false), 200) }}
          />

          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#111118', border: '1px solid rgba(200,242,60,0.2)',
              borderRadius: 12, marginTop: 4, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}>
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onMouseDown={() => startConversation(user.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,242,60,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: user.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 800, fontSize: 15, flexShrink: 0, overflow: 'hidden'
                  }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : getInitial(user.username)
                    }
                  </div>
                  <div>
                    <p style={{ color: '#f0f0f8', fontSize: 14, fontWeight: 700 }}>{user.display_name || user.username}</p>
                    <p style={{ color: '#555577', fontSize: 12 }}>@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showResults && searchQuery.length > 0 && searchResults.length === 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, marginTop: 4, padding: '16px', textAlign: 'center'
            }}>
              <p style={{ color: '#555577', fontSize: 14 }}>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>

        {/* Lista de conversas */}
        {loading && [1,2,3].map(i => (
          <div key={i} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 8, opacity: 0.5, display: 'flex', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#222230', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 14, background: '#222230', borderRadius: 4, width: '40%', marginBottom: 8 }} />
              <div style={{ height: 12, background: '#222230', borderRadius: 4, width: '70%' }} />
            </div>
          </div>
        ))}

        {!loading && conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 15 }}>Nenhuma conversa ainda.</p>
            <p style={{ fontSize: 13, marginTop: 8, color: '#333355' }}>Busque um usuário acima para começar!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => router.push(`/messages/${conv.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: '#111118',
                border: `1px solid ${conv.unread > 0 ? 'rgba(200,242,60,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 16, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.35)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(200,242,60,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = conv.unread > 0 ? 'rgba(200,242,60,0.25)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: conv.other_user.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 18, flexShrink: 0,
                overflow: 'hidden', boxShadow: '0 0 8px rgba(200,242,60,0.15)'
              }}>
                {conv.other_user.avatar_url
                  ? <img src={conv.other_user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitial(conv.other_user.username)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ color: '#f0f0f8', fontWeight: conv.unread > 0 ? 700 : 600, fontSize: 15 }}>
                    {conv.other_user.display_name || conv.other_user.username}
                  </p>
                  <span style={{ color: '#333355', fontSize: 12, flexShrink: 0 }}>{timeAgo(conv.last_message_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: conv.unread > 0 ? '#8888aa' : '#444466', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                    {conv.last_message || 'Iniciar conversa'}
                  </p>
                  {conv.unread > 0 && (
                    <span style={{ background: '#c8f23c', color: '#000', fontSize: 11, fontWeight: 800, borderRadius: 50, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 8px rgba(200,242,60,0.4)' }}>
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #555577; }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}