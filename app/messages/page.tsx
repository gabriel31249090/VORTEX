'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { now } from '@/lib/time'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import Image from 'next/image'

type ConversationRow = {
  id: string
  is_group: boolean
  group_name: string | null
  group_avatar_url: string | null
  created_at: string
}

type ConversationListItem = {
  id: string
  isGroup: boolean
  title: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unread: boolean
  otherUserId: string | null
  otherUsername: string | null
}

type UserResult = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Modal de nova conversa
  const [showNewChat, setShowNewChat] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)

  // Modal de novo grupo
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupSearch, setGroupSearch] = useState('')
  const [groupResults, setGroupResults] = useState<UserResult[]>([])
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const loadConversations = useCallback(async (uid: string) => {
    setLoading(true)

    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', uid)

    const convIds = (participantRows || []).map((r: { conversation_id: string }) => r.conversation_id)
    if (convIds.length === 0) { setConversations([]); setLoading(false); return }

    const { data: convs } = await supabase
      .from('conversations')
      .select('id, is_group, group_name, group_avatar_url, created_at')
      .in('id', convIds)

    const items: ConversationListItem[] = []

    for (const conv of (convs as ConversationRow[]) || []) {
      // Última mensagem
      const { data: lastMsgs } = await supabase
        .from('messages')
        .select('content, media_type, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
      const lastMsg = lastMsgs?.[0]

      // Última leitura do usuário pra saber se tem mensagem não lida
      const { data: myPart } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conv.id)
        .eq('user_id', uid)
        .single()

      const unread = !!(lastMsg && myPart && new Date(lastMsg.created_at) > new Date(myPart.last_read_at) && lastMsg.sender_id !== uid)

      if (conv.is_group) {
        items.push({
          id: conv.id,
          isGroup: true,
          title: conv.group_name || 'Grupo sem nome',
          avatarUrl: conv.group_avatar_url,
          lastMessage: lastMsg ? (lastMsg.content || (lastMsg.media_type ? '📎 Mídia' : '')) : 'Nenhuma mensagem ainda',
          lastMessageAt: lastMsg?.created_at || conv.created_at,
          unread,
          otherUserId: null,
          otherUsername: null,
        })
      } else {
        // Busca o outro participante
        const { data: others } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles(username, display_name, avatar_url)')
          .eq('conversation_id', conv.id)
          .neq('user_id', uid)
          .limit(1)
        const other = others?.[0] as { user_id: string; profiles: { username: string; display_name: string | null; avatar_url: string | null } | null } | undefined

        items.push({
          id: conv.id,
          isGroup: false,
          title: other?.profiles?.display_name || other?.profiles?.username || 'Usuário',
          avatarUrl: other?.profiles?.avatar_url || null,
          lastMessage: lastMsg ? (lastMsg.content || (lastMsg.media_type ? '📎 Mídia' : '')) : 'Nenhuma mensagem ainda',
          lastMessageAt: lastMsg?.created_at || conv.created_at,
          unread,
          otherUserId: other?.user_id || null,
          otherUsername: other?.profiles?.username || null,
        })
      }
    }

    items.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
    setConversations(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await loadConversations(user.id)
    }
    init()
  }, [loadConversations])

  // Realtime: qualquer mensagem nova recarrega a lista (simples e robusto)
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('messages-list-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadConversations(userId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, loadConversations])

  // Busca de usuários pra iniciar DM. Clearing the results when the search
  // box is emptied/closed happens synchronously during render (React's
  // documented "adjust state" pattern) so the effect below only has to
  // handle the debounced fetch, whose setState calls are already deferred.
  const dmSearchKey = `${showNewChat}:${search}`
  const [prevDmSearchKey, setPrevDmSearchKey] = useState(dmSearchKey)
  if (dmSearchKey !== prevDmSearchKey) {
    setPrevDmSearchKey(dmSearchKey)
    if (!showNewChat || search.trim() === '') setSearchResults([])
  }

  useEffect(() => {
    if (!showNewChat || search.trim() === '') return
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${search}%`)
        .neq('id', userId)
        .limit(10)
      setSearchResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search, showNewChat, userId])

  // Busca de usuários pra grupo (mesmo padrão acima)
  const groupSearchKey = `${showNewGroup}:${groupSearch}`
  const [prevGroupSearchKey, setPrevGroupSearchKey] = useState(groupSearchKey)
  if (groupSearchKey !== prevGroupSearchKey) {
    setPrevGroupSearchKey(groupSearchKey)
    if (!showNewGroup || groupSearch.trim() === '') setGroupResults([])
  }

  useEffect(() => {
    if (!showNewGroup || groupSearch.trim() === '') return
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${groupSearch}%`)
        .neq('id', userId)
        .limit(10)
      setGroupResults((data || []).filter(u => !selectedMembers.find(m => m.id === u.id)))
    }, 300)
    return () => clearTimeout(t)
  }, [groupSearch, showNewGroup, userId, selectedMembers])

  async function startConversation(otherUserId: string) {
    if (!userId) return

    // Verifica se já existe uma conversa 1:1 entre os dois
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    const myConvIds = (myConvs || []).map((c: { conversation_id: string }) => c.conversation_id)

    if (myConvIds.length > 0) {
      const { data: sharedConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations!inner(is_group)')
        .eq('user_id', otherUserId)
        .in('conversation_id', myConvIds)

      const existing = (sharedConvs || []).find((c: { conversations: { is_group: boolean } | { is_group: boolean }[] | null }) => {
        const conv = Array.isArray(c.conversations) ? c.conversations[0] : c.conversations
        return conv?.is_group === false
      })
      if (existing) {
        router.push(`/messages/${existing.conversation_id}`)
        return
      }
    }

    // Cria nova conversa 1:1
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: userId })
      .select('id')
      .single()

    if (error || !newConv) { console.error(error); return }

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: userId },
      { conversation_id: newConv.id, user_id: otherUserId },
    ])

    router.push(`/messages/${newConv.id}`)
  }

  async function createGroup() {
    if (!userId || !groupName.trim() || selectedMembers.length === 0) return
    setCreatingGroup(true)

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ is_group: true, group_name: groupName.trim(), created_by: userId })
      .select('id')
      .single()

    if (error || !newConv) { console.error(error); setCreatingGroup(false); return }

    const participants = [userId, ...selectedMembers.map(m => m.id)].map(uid => ({
      conversation_id: newConv.id, user_id: uid,
    }))
    await supabase.from('conversation_participants').insert(participants)

    setCreatingGroup(false)
    setShowNewGroup(false)
    setGroupName('')
    setSelectedMembers([])
    router.push(`/messages/${newConv.id}`)
  }

  function timeAgo(date: string | null) {
    if (!date) return ''
    const diff = Math.floor((now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return 'agora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return new Date(date).toLocaleDateString('pt-BR')
  }

  function getInitial(name: string) {
    return name?.charAt(0)?.toUpperCase() || '?'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, margin: 0 }}>Mensagens</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowNewGroup(true)}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: '#8888aa', padding: '8px 14px', borderRadius: 50, cursor: 'pointer',
                fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600,
              }}
            >
              👥 Grupo
            </button>
            <button
              onClick={() => setShowNewChat(true)}
              style={{
                background: '#c8f23c', border: 'none', color: '#000',
                padding: '8px 16px', borderRadius: 50, cursor: 'pointer',
                fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700,
                boxShadow: '0 0 12px rgba(200,242,60,0.3)',
              }}
            >
              ✎ Nova
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#111118', borderRadius: 14, padding: 16, display: 'flex', gap: 12, alignItems: 'center', animation: 'pulse 1.5s ease infinite' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a28', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '40%', marginBottom: 8 }} />
                  <div style={{ height: 10, background: '#1a1a28', borderRadius: 6, width: '65%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>💬</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Nenhuma conversa ainda.</p>
            <p style={{ fontSize: 13, color: '#333355' }}>Clique em &ldquo;Nova&rdquo; pra começar a conversar.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => router.push(`/messages/${conv.id}`)}
              style={{
                background: conv.unread ? 'rgba(200,242,60,0.04)' : '#111118',
                border: `1px solid ${conv.unread ? 'rgba(200,242,60,0.15)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = conv.unread ? 'rgba(200,242,60,0.15)' : 'rgba(255,255,255,0.06)')}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                background: conv.avatarUrl ? 'none' : conv.isGroup ? 'linear-gradient(135deg, #60a5fa, #3b82f6)' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 16,
              }}>
                {conv.avatarUrl
                  ? <Image src={conv.avatarUrl} alt="" fill sizes="44px" style={{ objectFit: 'cover' }} />
                  : conv.isGroup ? '👥' : getInitial(conv.title)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#f0f0f8', fontWeight: conv.unread ? 800 : 600, fontSize: 14 }}>{conv.title}</span>
                </div>
                <p style={{
                  color: conv.unread ? '#c8f23c' : '#555577', fontSize: 13, margin: '2px 0 0',
                  fontWeight: conv.unread ? 700 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {conv.lastMessage}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ color: '#444466', fontSize: 11 }}>{timeAgo(conv.lastMessageAt)}</span>
                {conv.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c8f23c', boxShadow: '0 0 6px rgba(200,242,60,0.6)' }} />}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal: nova conversa */}
      {showNewChat && (
        <>
          <div onClick={() => setShowNewChat(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#111118', border: '1px solid rgba(200,242,60,0.2)', borderRadius: 20,
            padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', zIndex: 201,
            fontFamily: "'Syne', sans-serif", display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 16, margin: 0 }}>Nova conversa</h3>
              <button onClick={() => setShowNewChat(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por username..."
              autoFocus
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', marginBottom: 12,
              }}
            />
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searching && <p style={{ color: '#555577', fontSize: 13, textAlign: 'center' }}>Buscando...</p>}
              {!searching && search && searchResults.length === 0 && (
                <p style={{ color: '#555577', fontSize: 13, textAlign: 'center' }}>Nenhum usuário encontrado.</p>
              )}
              {searchResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => { setShowNewChat(false); setSearch(''); startConversation(u.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 10, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                    background: u.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 13,
                  }}>
                    {u.avatar_url ? <Image src={u.avatar_url} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} /> : getInitial(u.username)}
                  </div>
                  <div>
                    <p style={{ color: '#f0f0f8', fontSize: 13, fontWeight: 600, margin: 0 }}>{u.display_name || u.username}</p>
                    <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal: novo grupo */}
      {showNewGroup && (
        <>
          <div onClick={() => setShowNewGroup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(6px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#111118', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 20,
            padding: 24, width: '90%', maxWidth: 400, maxHeight: '80vh', zIndex: 201,
            fontFamily: "'Syne', sans-serif", display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 16, margin: 0 }}>👥 Novo grupo</h3>
              <button onClick={() => { setShowNewGroup(false); setSelectedMembers([]); setGroupName('') }} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Nome do grupo"
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', marginBottom: 10,
              }}
            />

            {selectedMembers.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {selectedMembers.map(m => (
                  <span key={m.id} onClick={() => setSelectedMembers(prev => prev.filter(x => x.id !== m.id))}
                    style={{
                      background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
                      color: '#60a5fa', fontSize: 12, padding: '4px 10px', borderRadius: 50, cursor: 'pointer',
                    }}>
                    @{m.username} ✕
                  </span>
                ))}
              </div>
            )}

            <input
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
              placeholder="Adicionar membros..."
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", boxSizing: 'border-box', marginBottom: 10,
              }}
            />

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14, maxHeight: 200 }}>
              {groupResults.map(u => (
                <div
                  key={u.id}
                  onClick={() => { setSelectedMembers(prev => [...prev, u]); setGroupSearch('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 10, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                    background: u.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 12,
                  }}>
                    {u.avatar_url ? <Image src={u.avatar_url} alt="" fill sizes="30px" style={{ objectFit: 'cover' }} /> : getInitial(u.username)}
                  </div>
                  <p style={{ color: '#f0f0f8', fontSize: 13, margin: 0 }}>@{u.username}</p>
                </div>
              ))}
            </div>

            <button
              onClick={createGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0 || creatingGroup}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 50, border: 'none',
                background: (!groupName.trim() || selectedMembers.length === 0) ? 'rgba(255,255,255,0.06)' : '#60a5fa',
                color: (!groupName.trim() || selectedMembers.length === 0) ? '#555577' : '#000',
                fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif",
                cursor: (!groupName.trim() || selectedMembers.length === 0) ? 'default' : 'pointer',
              }}
            >
              {creatingGroup ? 'Criando...' : `Criar grupo ${selectedMembers.length > 0 ? `(${selectedMembers.length + 1} membros)` : ''}`}
            </button>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #333355; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}