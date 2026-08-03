'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import Image from 'next/image'

type PlanId = 'free' | 'boost' | 'mega'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow' | 'mention' | 'plan_approved'
  read: boolean
  created_at: string
  post_id: string | null
  plan: PlanId | null
  actor: {
    username: string
    avatar_url: string | null
  } | null
  post: {
    title: string
  } | null
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  boost: '⚡ BOOST',
  mega: '👑 MEGA BOOST',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('notifications')
        .select(`
          id, type, read, created_at, post_id, plan,
          actor:actor_id(username, avatar_url),
          post:post_id(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications((data as any) || [])

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      setLoading(false)
    }
    load()
  }, [])

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
    return new Date(date).toLocaleDateString('pt-BR')
  }

  function getIcon(type: string) {
    if (type === 'like') return { icon: '▲', color: '#c8f23c', bg: 'rgba(200,242,60,0.15)' }
    if (type === 'comment') return { icon: '💬', color: '#60aaff', bg: 'rgba(96,170,255,0.15)' }
    if (type === 'follow') return { icon: '◉', color: '#ff88cc', bg: 'rgba(255,136,204,0.15)' }
    if (type === 'mention') return { icon: '@', color: '#c8f23c', bg: 'rgba(200,242,60,0.15)' }
    if (type === 'plan_approved') return { icon: '⚡', color: '#c8f23c', bg: 'rgba(200,242,60,0.15)' }
    return { icon: '•', color: '#8888aa', bg: 'rgba(136,136,170,0.15)' }
  }

  function getMessage(n: Notification) {
    const name = n.actor?.username || 'alguém'
    if (n.type === 'like') return <><strong style={{ color: '#f0f0f8' }}>@{name}</strong> curtiu seu post{n.post ? <> "<span style={{ color: '#8888aa' }}>{n.post.title}</span>"</> : ''}</>
    if (n.type === 'comment') return <><strong style={{ color: '#f0f0f8' }}>@{name}</strong> comentou no seu post{n.post ? <> "<span style={{ color: '#8888aa' }}>{n.post.title}</span>"</> : ''}</>
    if (n.type === 'follow') return <><strong style={{ color: '#f0f0f8' }}>@{name}</strong> começou a te seguir</>
    if (n.type === 'mention') return <><strong style={{ color: '#f0f0f8' }}>@{name}</strong> mencionou você em um comentário</>
    if (n.type === 'plan_approved' && n.plan) return (
      <>Seu plano <strong style={{ color: n.plan === 'mega' ? '#a78bfa' : '#c8f23c' }}>{PLAN_LABELS[n.plan]}</strong> foi ativado! 🎉</>
    )
    return <span>Nova notificação</span>
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24 }}>Notificações</h1>
            {unreadCount > 0 && (
              <span style={{
                background: '#c8f23c', color: '#000', fontSize: 12, fontWeight: 800,
                borderRadius: 999, padding: '2px 8px',
                boxShadow: '0 0 10px rgba(200,242,60,0.4)'
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                color: '#555577', padding: '6px 14px', borderRadius: 50, cursor: 'pointer',
                fontSize: 12, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,50,50,0.4)'; e.currentTarget.style.color = '#ff4466' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#555577' }}
            >
              Limpar tudo
            </button>
          )}
        </div>

        <div style={{
          display: 'flex', background: '#111118', borderRadius: 10,
          padding: 3, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20
        }}>
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: filter === f ? 'rgba(200,242,60,0.12)' : 'transparent',
                color: filter === f ? '#c8f23c' : '#555577',
              }}
            >
              {f === 'all' ? 'Todas' : 'Não lidas'}
            </button>
          ))}
        </div>

        {loading && [1,2,3,4].map(i => (
          <div key={i} style={{ background: '#111118', borderRadius: 14, padding: 16, marginBottom: 10, opacity: 0.5, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#222230', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: '#222230', borderRadius: 6, width: '70%', marginBottom: 8 }} />
              <div style={{ height: 10, background: '#222230', borderRadius: 6, width: '30%' }} />
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🔔</div>
            <p style={{ fontSize: 14 }}>
              {filter === 'unread' ? 'Nenhuma notificação não lida.' : 'Nenhuma notificação ainda.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((n, i) => {
            const { icon, color, bg } = getIcon(n.type)
            const isPlanNotif = n.type === 'plan_approved'
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (isPlanNotif) router.push('/pricing')
                  else if (n.type === 'follow' && n.actor?.username) router.push(`/profile/${n.actor.username}`)
                  else if (n.post_id) router.push(`/post/${n.post_id}`)
                }}
                style={{
                  background: n.read ? '#111118' : 'rgba(200,242,60,0.04)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,242,60,0.15)'}`,
                  borderRadius: 14, padding: '14px 16px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 14,
                  animation: `fadeIn 0.3s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,242,60,0.15)' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {isPlanNotif ? (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: n.plan === 'mega' ? 'linear-gradient(135deg, #a78bfa, #7c5cbf)' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, boxShadow: `0 0 12px ${n.plan === 'mega' ? 'rgba(167,139,250,0.5)' : 'rgba(200,242,60,0.5)'}`,
                    }}>
                      {n.plan === 'mega' ? '👑' : '⚡'}
                    </div>
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                      background: n.actor?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#000',
                    }}>
                      {n.actor?.avatar_url
                        ? <Image src={n.actor.avatar_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                        : n.actor?.username?.charAt(0).toUpperCase() || '?'
                      }
                    </div>
                  )}
                  {!isPlanNotif && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: bg, border: '2px solid #0a0a0f',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color,
                    }}>
                      {icon}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.5 }}>
                    {getMessage(n)}
                  </p>
                  <p style={{ color: '#444466', fontSize: 12, marginTop: 2 }}>{timeAgo(n.created_at)}</p>
                </div>

                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#c8f23c', flexShrink: 0,
                    boxShadow: '0 0 6px rgba(200,242,60,0.6)'
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}