'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '../../components/Nav'
import Image from 'next/image'

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'gif' | 'video' | 'audio' | null
  created_at: string
  profiles?: { username: string; avatar_url: string | null } | null
}

type Participant = {
  user_id: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isGroup, setIsGroup] = useState(false)
  const [groupName, setGroupName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const conversationId = params.id as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Confirma que o usuário participa dessa conversa
      const { data: myPart } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (!myPart) { router.push('/messages'); return }

      const { data: conv } = await supabase
        .from('conversations')
        .select('is_group, group_name')
        .eq('id', conversationId)
        .single()

      setIsGroup(conv?.is_group || false)
      setGroupName(conv?.group_name || null)

      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles(username, display_name, avatar_url)')
        .eq('conversation_id', conversationId)
      setParticipants((parts as unknown as Participant[]) || [])

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, media_url, media_type, created_at, profiles(username, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages((msgs as unknown as Message[]) || [])

      // Marca como lida
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      setLoading(false)
    }
    load()
  }, [conversationId])

  // Realtime: novas mensagens dessa conversa
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const { data: fullMsg } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, media_url, media_type, created_at, profiles(username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (fullMsg) {
          const msg = fullMsg as unknown as Message
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
          // Marca como lida se a mensagem não é minha
          if (msg.sender_id !== userId && userId) {
            supabase.from('conversation_participants')
              .update({ last_read_at: new Date().toISOString() })
              .eq('conversation_id', conversationId)
              .eq('user_id', userId)
              .then(() => {})
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { alert('Arquivo deve ter no máximo 20MB'); return }
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function clearMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSend() {
    if ((!text.trim() && !mediaFile) || !userId || sending) return
    setSending(true)

    let mediaUrl: string | null = null
    let mediaType: string | null = null

    if (mediaFile) {
      setUploading(true)
      const ext = mediaFile.name.split('.').pop()
      const path = `dm/${conversationId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('media').upload(path, mediaFile)
      if (uploadError) {
        alert('Erro ao enviar mídia: ' + uploadError.message)
        setSending(false); setUploading(false); return
      }
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      mediaType = mediaFile.type.startsWith('video/') ? 'video'
        : mediaFile.type.startsWith('audio/') ? 'audio'
        : mediaFile.type === 'image/gif' ? 'gif' : 'image'
      setUploading(false)
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: text.trim() || null,
      media_url: mediaUrl,
      media_type: mediaType,
    })

    if (!error) {
      setText('')
      clearMedia()

      if (otherParticipant) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: otherParticipant.user_id,
            title: `Nova mensagem`,
            body: text.trim() ? text.trim().slice(0, 120) : 'Enviou uma mídia',
            url: `/messages/${conversationId}`,
          }),
        }).catch(() => {})
      }
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function timeLabel(date: string) {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  function getInitial(name: string) {
    return name?.charAt(0)?.toUpperCase() || '?'
  }

  const otherParticipant = !isGroup ? participants.find(p => p.user_id !== userId) : null
  const headerTitle = isGroup ? (groupName || 'Grupo') : (otherParticipant?.profiles?.display_name || otherParticipant?.profiles?.username || 'Usuário')
  const headerAvatar = isGroup ? null : otherParticipant?.profiles?.avatar_url

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.15)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <button onClick={() => router.push('/messages')} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}>← </button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
            background: headerAvatar ? 'none' : isGroup ? 'linear-gradient(135deg, #60a5fa, #3b82f6)' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 14,
          }}>
            {headerAvatar ? <Image src={headerAvatar} alt="" fill sizes="36px" style={{ objectFit: 'cover' }} /> : isGroup ? '👥' : getInitial(headerTitle)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, margin: 0 }}>{headerTitle}</p>
            {isGroup && <p style={{ color: '#555577', fontSize: 11, margin: 0 }}>{participants.length} membros</p>}
          </div>
        </div>
      </header>

      <main style={{
        flex: 1, maxWidth: 680, margin: '0 auto', width: '100%',
        padding: '20px 16px 20px', paddingLeft: 'max(16px, calc(220px + 32px))',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>💬</div>
            <p style={{ fontSize: 14 }}>Nenhuma mensagem ainda. Diga oi!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMine = msg.sender_id === userId
          const showAvatar = isGroup && !isMine
          const prevSameSender = i > 0 && messages[i - 1].sender_id === msg.sender_id

          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
              {showAvatar && !prevSameSender && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                  background: msg.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 10,
                }}>
                  {msg.profiles?.avatar_url ? <Image src={msg.profiles.avatar_url} alt="" fill sizes="26px" style={{ objectFit: 'cover' }} /> : getInitial(msg.profiles?.username || '?')}
                </div>
              )}
              {showAvatar && prevSameSender && <div style={{ width: 26, flexShrink: 0 }} />}

              <div style={{ maxWidth: '72%' }}>
                {isGroup && !isMine && !prevSameSender && (
                  <p style={{ color: '#555577', fontSize: 11, margin: '0 0 3px 4px' }}>@{msg.profiles?.username}</p>
                )}
                <div style={{
                  background: isMine ? 'rgba(200,242,60,0.15)' : '#18181f',
                  border: `1px solid ${isMine ? 'rgba(200,242,60,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 16,
                  borderBottomRightRadius: isMine ? 4 : 16,
                  borderBottomLeftRadius: isMine ? 16 : 4,
                  padding: msg.media_url ? 6 : '9px 14px',
                  overflow: 'hidden',
                }}>
                  {msg.media_url && msg.media_type === 'video' && (
                    <video src={msg.media_url} controls style={{ maxWidth: '100%', borderRadius: 10, display: 'block' }} />
                  )}
                  {msg.media_url && (msg.media_type === 'image' || msg.media_type === 'gif') && (
                    <img src={msg.media_url} alt="" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, display: 'block' }} />
                  )}
                  {msg.media_url && msg.media_type === 'audio' && (
                    <audio src={msg.media_url} controls style={{ maxWidth: 220 }} />
                  )}
                  {msg.content && (
                    <p style={{ color: '#f0f0f8', fontSize: 14, lineHeight: 1.5, margin: msg.media_url ? '6px 8px 2px' : 0, wordBreak: 'break-word' }}>
                      {msg.content}
                    </p>
                  )}
                </div>
                <p style={{ color: '#444466', fontSize: 10, margin: `3px ${isMine ? '4px' : '4px'} 0`, textAlign: isMine ? 'right' : 'left' }}>
                  {timeLabel(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input fixo embaixo */}
      <div className="chat-input-bar" style={{
        position: 'sticky', bottom: 0,
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px', paddingLeft: 'max(16px, calc(220px + 32px))',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {mediaPreview && (
            <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} style={{ height: 70, borderRadius: 10 }} />
              ) : mediaFile?.type.startsWith('audio/') ? (
                <div style={{ background: '#18181f', padding: '8px 14px', borderRadius: 10, color: '#8888aa', fontSize: 12 }}>🎵 {mediaFile.name}</div>
              ) : (
                <img src={mediaPreview} alt="" style={{ height: 70, borderRadius: 10 }} />
              )}
              <button onClick={clearMedia} style={{ position: 'absolute', top: -6, right: -6, background: '#ff4466', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#8888aa', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
                fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >📎</button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" style={{ display: 'none' }} onChange={handleFileSelect} />

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              rows={1}
              style={{
                flex: 1, background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none',
                maxHeight: 100, boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />

            <button
              onClick={handleSend}
              disabled={(!text.trim() && !mediaFile) || sending}
              style={{
                background: (!text.trim() && !mediaFile) ? 'rgba(255,255,255,0.05)' : '#c8f23c',
                border: 'none', color: (!text.trim() && !mediaFile) ? '#555577' : '#000',
                width: 40, height: 40, borderRadius: 12, cursor: (!text.trim() && !mediaFile) ? 'default' : 'pointer',
                fontSize: 15, flexShrink: 0, fontWeight: 700,
                boxShadow: (!text.trim() && !mediaFile) ? 'none' : '0 0 12px rgba(200,242,60,0.3)',
              }}
            >
              {uploading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        textarea::placeholder { color: #333355; }
        @media (max-width: 767px) { main, header > div, .chat-input-bar { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}