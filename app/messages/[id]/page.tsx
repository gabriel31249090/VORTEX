'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
  read: boolean
}

type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const convId = params.id as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Busca o outro participante sem join
      const { data: others } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId)
        .neq('user_id', user.id)

      const otherUserId = others?.[0]?.user_id
      if (otherUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', otherUserId)
          .single()
        if (profile) setOtherUser(profile)
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      await supabase.from('messages')
        .update({ read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)

      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`conv-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim() || !userId || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: userId,
      content
    })
    setSending(false)
  }

  function timeStr(date: string) {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.15)',
        padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0, zIndex: 10
      }}>
        <button
          onClick={() => router.push('/messages')}
          style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 18 }}
        >
          ←
        </button>
        {otherUser && (
          <>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: otherUser.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 800, fontSize: 14,
              boxShadow: '0 0 8px rgba(200,242,60,0.2)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {otherUser.avatar_url
                ? <img src={otherUser.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitial(otherUser.username)
              }
            </div>
            <div
              onClick={() => router.push(`/profile/${otherUser.username}`)}
              style={{ cursor: 'pointer' }}
            >
              <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>{otherUser.display_name || otherUser.username}</p>
              <p style={{ color: '#555577', fontSize: 12 }}>@{otherUser.username}</p>
            </div>
          </>
        )}
      </header>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#555577', padding: '40px 0' }}>Carregando...</div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#444466', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <p>Comece a conversa!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === userId
          const prevMsg = messages[i - 1]
          const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000

          return (
            <div key={msg.id}>
              {showTime && (
                <p style={{ textAlign: 'center', color: '#333355', fontSize: 11, margin: '8px 0' }}>
                  {timeStr(msg.created_at)}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '70%', padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe ? '#c8f23c' : '#111118',
                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: isMe ? '#000' : '#f0f0f8',
                  fontSize: 14, lineHeight: 1.5,
                  boxShadow: isMe ? '0 0 12px rgba(200,242,60,0.2)' : 'none'
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0
      }}>
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Mensagem..."
          rows={1}
          style={{
            flex: 1, background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
            outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none',
            maxHeight: 120, transition: 'border-color 0.2s'
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          style={{
            background: '#c8f23c', color: '#000', border: 'none',
            width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(200,242,60,0.3)', transition: 'all 0.2s',
            opacity: sending || !newMessage.trim() ? 0.5 : 1, flexShrink: 0
          }}
        >
          ↑
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        textarea::placeholder { color: #333355; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #222230; border-radius: 2px; }
      `}</style>
    </div>
  )
}