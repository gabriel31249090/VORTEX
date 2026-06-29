'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  read: boolean
  created_at: string
  post_id: string | null
  actor: { id: string; username: string; display_name: string | null; avatar_url: string | null }
  post?: { id: string; title: string } | null
}

const TYPE_CONFIG = {
  like: { icon: '▲', label: 'curtiu sua publicação', color: '#c8f23c' },
  comment: { icon: '💬', label: 'comentou em sua publicação', color: '#60a5fa' },
  follow: { icon: '→', label: 'começou a te seguir', color: '#a78bfa' },
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('username, is_admin')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setUsername(data.username)
        setIsAdmin(data.is_admin === true)
      }

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadCount(count || 0)
    }
    load()
  }, [pathname])

  async function openNotifications() {
    setNotifOpen(true)
    setNotifLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNotifLoading(false); return }

    const { data } = await supabase
      .from('notifications')
      .select(`
        id, type, read, created_at, post_id,
        actor:actor_id ( id, username, display_name, avatar_url ),
        post:post_id ( id, title )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)

    setNotifications((data as any) || [])
    setNotifLoading(false)

    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setUnreadCount(0)
  }

  function closeNotifications() {
    setNotifOpen(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleProfileClick() {
    if (username) { router.push(`/profile/${username}`); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
    if (data?.username) { setUsername(data.username); router.push(`/profile/${data.username}`) }
  }

  const items = [
    { icon: '◆', label: 'Planos', path: '/pricing', onClick: () => router.push('/pricing') },
    { icon: '⌂', label: 'Feed', path: '/feed', onClick: () => router.push('/feed') },
    { icon: '⊞', label: 'Comunidades', path: '/communities', onClick: () => router.push('/communities') },
    { icon: '＋', label: 'Publicar', path: '/post/new', accent: true, onClick: () => router.push('/post/new') },
    { icon: '🔔', label: 'Notificações', path: '__notif__', onClick: openNotifications },
    { icon: '◉', label: 'Perfil', path: '/profile', onClick: handleProfileClick },
    { icon: '⚙', label: 'Config', path: '/settings', onClick: () => router.push('/settings') },
    ...(isAdmin ? [{ icon: '🛡️', label: 'Admin', path: '/admin', admin: true, onClick: () => router.push('/admin') }] : []),
  ]

  return (
    <>
      {/* SIDEBAR — Desktop */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
        background: '#0d0d12', borderRight: '1px solid rgba(200,242,60,0.1)',
        display: 'flex', flexDirection: 'column', padding: '24px 0',
        zIndex: 100, fontFamily: "'Syne', sans-serif"
      }} className="nav-sidebar">
        <div onClick={() => router.push('/feed')} style={{ padding: '0 20px 32px', cursor: 'pointer' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#c8f23c', textShadow: '0 0 20px rgba(200,242,60,0.5)' }}>◈ VORTEX</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
          {items.map(item => {
            const isActive = item.path !== '__notif__' && (pathname === item.path || (item.path !== '/feed' && pathname.startsWith(item.path)))
            const isNotif = item.path === '__notif__'
            const isAdminItem = (item as any).admin === true
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, position: 'relative',
                  padding: '10px 12px', borderRadius: 12, border: isAdminItem ? '1px solid rgba(200,242,60,0.15)' : 'none',
                  cursor: 'pointer',
                  background: item.accent ? '#c8f23c'
                    : isActive && isAdminItem ? 'rgba(200,242,60,0.12)'
                    : isActive ? 'rgba(200,242,60,0.1)'
                    : isAdminItem ? 'rgba(200,242,60,0.04)'
                    : 'transparent',
                  color: item.accent ? '#000' : isActive ? '#c8f23c' : isAdminItem ? '#c8f23c' : '#8888aa',
                  fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: item.accent || isActive || isAdminItem ? 700 : 500,
                  transition: 'all 0.2s', textAlign: 'left',
                  marginTop: isAdminItem ? 8 : 0,
                  boxShadow: item.accent ? '0 0 12px rgba(200,242,60,0.3)' : isActive ? '0 0 8px rgba(200,242,60,0.1)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!item.accent && !isActive && !isAdminItem) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#f0f0f8'
                  }
                  if (isAdminItem && !isActive) {
                    e.currentTarget.style.background = 'rgba(200,242,60,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (!item.accent && !isActive && !isAdminItem) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8888aa'
                  }
                  if (isAdminItem && !isActive) {
                    e.currentTarget.style.background = 'rgba(200,242,60,0.04)'
                  }
                }}
              >
                <span style={{ fontSize: 18, position: 'relative' }}>
                  {item.icon}
                  {isNotif && unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -6, right: -8,
                      background: '#c8f23c', color: '#000',
                      fontSize: 9, fontWeight: 800, borderRadius: 999,
                      padding: '1px 4px', minWidth: 14, textAlign: 'center', lineHeight: 1.5,
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '0 12px' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#555577',
              fontFamily: "'Syne', sans-serif", fontSize: 14, width: '100%', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff4466' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555577' }}
          >
            <span style={{ fontSize: 18 }}>⏻</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV — Mobile */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(13,13,18,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(200,242,60,0.15)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 12px', zIndex: 100, fontFamily: "'Syne', sans-serif"
      }} className="nav-bottom">
        {items.filter(i => !(i as any).admin).map(item => {
          const isActive = item.path !== '__notif__' && (pathname === item.path || (item.path !== '/feed' && pathname.startsWith(item.path)))
          const isNotif = item.path === '__notif__'
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: item.accent ? '#c8f23c' : 'transparent',
                border: 'none', cursor: 'pointer', padding: item.accent ? '8px 16px' : '4px 12px',
                borderRadius: item.accent ? 50 : 8, position: 'relative',
                color: item.accent ? '#000' : isActive ? '#c8f23c' : '#555577',
                boxShadow: item.accent ? '0 0 12px rgba(200,242,60,0.4)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 20, position: 'relative' }}>
                {item.icon}
                {isNotif && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8,
                    background: '#c8f23c', color: '#000',
                    fontSize: 9, fontWeight: 800, borderRadius: 999,
                    padding: '1px 4px', minWidth: 14, textAlign: 'center', lineHeight: 1.5,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              {!item.accent && <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* PAINEL DE NOTIFICAÇÕES */}
      {notifOpen && (
        <>
          <div
            onClick={closeNotifications}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 200, backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.2s ease',
            }}
          />

          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            background: '#0d0d12', borderLeft: '1px solid rgba(200,242,60,0.15)',
            zIndex: 201, display: 'flex', flexDirection: 'column',
            fontFamily: "'Syne', sans-serif",
            animation: 'slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          }}>
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 18, margin: 0 }}>Notificações</h2>
                {unreadCount === 0 && notifications.length > 0 && (
                  <p style={{ color: '#333355', fontSize: 12, marginTop: 2 }}>Tudo lido</p>
                )}
              </div>
              <button
                onClick={closeNotifications}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa',
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f0f0f8' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#8888aa' }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {notifLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 16px' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center', animation: 'pulse 1.5s ease infinite' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a28', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 13, background: '#1a1a28', borderRadius: 6, width: '70%', marginBottom: 8 }} />
                        <div style={{ height: 11, background: '#1a1a28', borderRadius: 6, width: '40%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!notifLoading && notifications.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 40, opacity: 0.2 }}>🔔</div>
                  <p style={{ color: '#333355', fontSize: 14 }}>Nenhuma notificação ainda.</p>
                </div>
              )}

              {!notifLoading && notifications.map((notif, i) => {
                const config = TYPE_CONFIG[notif.type]
                const actor = notif.actor as any
                const post = notif.post as any

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      closeNotifications()
                      if (notif.type === 'follow') router.push(`/profile/${actor.username}`)
                      else if (post) router.push(`/post/${post.id}`)
                    }}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 20px', cursor: 'pointer',
                      background: notif.read ? 'transparent' : 'rgba(200,242,60,0.04)',
                      borderLeft: `3px solid ${notif.read ? 'transparent' : '#c8f23c'}`,
                      transition: 'all 0.15s',
                      animation: `fadeIn 0.3s ease ${i * 0.03}s both`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(200,242,60,0.04)' }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                        background: actor?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontWeight: 800, fontSize: 16,
                      }}>
                        {actor?.avatar_url
                          ? <img src={actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : actor?.username?.charAt(0).toUpperCase()
                        }
                      </div>
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#0d0d12', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, border: `1.5px solid ${config.color}`, color: config.color,
                      }}>
                        {config.icon}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#c8c8e0', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                        <span style={{ fontWeight: 700, color: '#f0f0f8' }}>@{actor?.username}</span>
                        {' '}{config.label}
                        {post && (
                          <span style={{ color: '#8888aa', fontStyle: 'italic' }}>
                            {': '}{post.title.length > 35 ? post.title.slice(0, 35) + '…' : post.title}
                          </span>
                        )}
                      </p>
                      <p style={{ color: '#333355', fontSize: 11, marginTop: 3 }}>{timeAgo(notif.created_at)}</p>
                    </div>

                    {!notif.read && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c8f23c', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                )
              })}
            </div>

            {notifications.length > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => { closeNotifications(); router.push('/notifications') }}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: '#8888aa', cursor: 'pointer',
                    fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888aa' }}
                >
                  Ver todas as notificações →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (min-width: 768px) {
          .nav-bottom { display: none !important; }
          .nav-sidebar { display: flex !important; }
        }
        @media (max-width: 767px) {
          .nav-bottom { display: flex !important; }
          .nav-sidebar { display: none !important; }
        }
      `}</style>
    </>
  )
}