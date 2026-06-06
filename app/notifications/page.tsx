'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  read: boolean
  created_at: string
  post_id: string | null
  actor: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  post?: {
    id: string
    title: string
  } | null
}

const TYPE_CONFIG = {
  like: { icon: '▲', label: 'curtiu sua publicação', color: '#c8f23c' },
  comment: { icon: '💬', label: 'comentou em sua publicação', color: '#60a5fa' },
  follow: { icon: '→', label: 'começou a te seguir', color: '#a78bfa' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('notifications')
      .select(`
        id, type, read, created_at, post_id,
        actor:actor_id ( id, username, display_name, avatar_url ),
        post:post_id ( id, title )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)

    setNotifications((data as any) || [])
    setLoading(false)

    // Marca todas como lidas
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  async function clearAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/feed')}
              style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
            >
              ← Voltar
            </button>
            <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>Notificações</span>
            {unreadCount > 0 && (
              <span style={{
                background: '#c8f23c', color: '#000', fontSize: 11, fontWeight: 800,
                borderRadius: 999, padding: '2px 7px',
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{ background: 'none', border: 'none', color: '#333355', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif" }}
              onMouseEnter={e => (e.currentTarget.style.color = '#8888aa')}
              onMouseLeave={e => (e.currentTarget.style.color = '#333355')}
            >
              Limpar tudo
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#111118', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'unread'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: filter === tab ? '#c8f23c' : 'transparent',
                color: filter === tab ? '#000' : '#555577',
              }}
            >
              {tab === 'all' ? 'Todas' : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '60px 0' }}>Carregando...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 40, opacity: 0.3 }}>🔔</div>
            <p style={{ color: '#333355', fontSize: 14 }}>
              {filter === 'unread' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação ainda.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((notif, i) => {
            const config = TYPE_CONFIG[notif.type]
            const actor = notif.actor as any
            const post = notif.post as any

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (notif.type === 'follow') router.push(`/profile/${actor.username}`)
                  else if (post) router.push(`/post/${post.id}`)
                }}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  background: notif.read ? 'transparent' : 'rgba(200,242,60,0.04)',
                  border: `1px solid ${notif.read ? 'transparent' : 'rgba(200,242,60,0.08)'}`,
                  transition: 'all 0.15s',
                  animation: `fadeIn 0.3s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(200,242,60,0.04)' }}
              >
                {/* Avatar + ícone do tipo */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
                    background: actor?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 800, fontSize: 18,
                    border: '2px solid rgba(255,255,255,0.06)',
                  }}>
                    {actor?.avatar_url
                      ? <img src={actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : actor?.username?.charAt(0).toUpperCase()
                    }
                  </div>
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#0a0a0f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, border: `1.5px solid ${config.color}`,
                    color: config.color,
                  }}>
                    {config.icon}
                  </div>
                </div>

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#c8c8e0', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: '#f0f0f8' }}>@{actor?.username}</span>
                    {' '}{config.label}
                    {post && (
                      <>
                        {': '}
                        <span style={{ color: '#8888aa', fontStyle: 'italic' }}>
                          {post.title.length > 40 ? post.title.slice(0, 40) + '…' : post.title}
                        </span>
                      </>
                    )}
                  </p>
                  <p style={{ color: '#333355', fontSize: 12, marginTop: 4 }}>{timeAgo(notif.created_at)}</p>
                </div>

                {/* Dot não lida */}
                {!notif.read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c8f23c', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}