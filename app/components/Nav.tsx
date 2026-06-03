'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
      if (data) setUsername(data.username)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleProfileClick() {
    if (username) {
      router.push(`/profile/${username}`)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
    if (data?.username) {
      setUsername(data.username)
      router.push(`/profile/${data.username}`)
    }
  }

  const items = [
    { icon: '⌂', label: 'Feed', path: '/feed', onClick: () => router.push('/feed') },
    { icon: '⊞', label: 'Comunidades', path: '/communities', onClick: () => router.push('/communities') },
    { icon: '＋', label: 'Publicar', path: '/post/new', accent: true, onClick: () => router.push('/post/new') },
    { icon: '◉', label: 'Perfil', path: '/profile', onClick: handleProfileClick },
    { icon: '⚙', label: 'Config', path: '/settings', onClick: () => router.push('/settings') },
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
            const isActive = pathname === item.path || (item.path !== '/feed' && pathname.startsWith(item.path))
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: item.accent ? '#c8f23c' : isActive ? 'rgba(200,242,60,0.1)' : 'transparent',
                  color: item.accent ? '#000' : isActive ? '#c8f23c' : '#8888aa',
                  fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: item.accent || isActive ? 700 : 500,
                  transition: 'all 0.2s', textAlign: 'left',
                  boxShadow: item.accent ? '0 0 12px rgba(200,242,60,0.3)' : isActive ? '0 0 8px rgba(200,242,60,0.1)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!item.accent && !isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#f0f0f8'
                  }
                }}
                onMouseLeave={e => {
                  if (!item.accent && !isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8888aa'
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
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
        {items.map(item => {
          const isActive = pathname === item.path || (item.path !== '/feed' && pathname.startsWith(item.path))
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: item.accent ? '#c8f23c' : 'transparent',
                border: 'none', cursor: 'pointer', padding: item.accent ? '8px 16px' : '4px 12px',
                borderRadius: item.accent ? 50 : 8,
                color: item.accent ? '#000' : isActive ? '#c8f23c' : '#555577',
                boxShadow: item.accent ? '0 0 12px rgba(200,242,60,0.4)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {!item.accent && <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
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