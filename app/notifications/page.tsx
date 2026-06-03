'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type NavItem = {
  icon: string
  label: string
  href: string
  activeIcon?: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: '⌂', label: 'Feed', href: '/feed' },
  { icon: '⌕', label: 'Buscar', href: '/search' },
  { icon: '+', label: 'Postar', href: '/post/new' },
  { icon: '🔔', label: 'Avisos', href: '/notifications' },
  { icon: '◉', label: 'Perfil', href: '/profile' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [username, setUsername] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single()
      if (profile) setUsername(profile.username)

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadCount(count || 0)
    }
    load()
  }, [pathname])

  function getHref(item: NavItem) {
    if (item.href === '/profile' && username) return `/profile/${username}`
    return item.href
  }

  function isActive(item: NavItem) {
    if (item.href === '/profile') return pathname.startsWith('/profile')
    if (item.href === '/feed') return pathname === '/feed'
    return pathname.startsWith(item.href)
  }

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(200,242,60,0.12)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{
        maxWidth: 680, margin: '0 auto',
        display: 'flex', alignItems: 'stretch',
        height: 56,
      }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item)
          const isPost = item.href === '/post/new'

          return (
            <button
              key={item.href}
              onClick={() => router.push(getHref(item))}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: "'Syne', sans-serif",
                position: 'relative', transition: 'all 0.15s',
              }}
            >
              {/* Post button special style */}
              {isPost ? (
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: '#c8f23c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 800, color: '#000',
                  boxShadow: '0 0 16px rgba(200,242,60,0.4)',
                  transform: active ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.15s',
                }}>
                  +
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      fontSize: item.icon === '⌂' ? 22 : item.icon === '⌕' ? 20 : item.icon === '◉' ? 18 : 17,
                      color: active ? '#c8f23c' : '#333355',
                      transition: 'color 0.15s',
                      display: 'block', lineHeight: 1,
                    }}>
                      {item.icon}
                    </span>
                    {/* Notification badge */}
                    {item.href === '/notifications' && unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -8,
                        background: '#c8f23c', color: '#000',
                        fontSize: 9, fontWeight: 800,
                        borderRadius: 999, padding: '1px 4px',
                        minWidth: 14, textAlign: 'center', lineHeight: 1.5,
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
                    color: active ? '#c8f23c' : '#222240',
                    transition: 'color 0.15s',
                  }}>
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {active && (
                    <div style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 3, height: 3, borderRadius: '50%',
                      background: '#c8f23c',
                    }} />
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
      `}</style>
    </nav>
  )
}