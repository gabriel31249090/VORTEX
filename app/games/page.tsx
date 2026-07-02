'use client'

import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'

type GameEntry = {
  id: string
  name: string
  icon: string
  desc: string
  path: string
  status: 'live' | 'soon'
}

const GAMES: GameEntry[] = [
  {
    id: 'abismo',
    name: 'Abismo das Fichas',
    icon: '🎰',
    desc: 'Roguelike de cartas multiplayer. Crie seu personagem e desça no abismo.',
    path: '/games/abismo',
    status: 'live',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: '💻',
    desc: 'Terminal em português com comandos e easter eggs do Vortex.',
    path: '/games/terminal',
    status: 'soon',
  },
]

export default function GamesHubPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d12', color: '#f0f0f8', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px', paddingLeft: 'calc(220px + 24px)' }}
        className="games-main">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#c8f23c' }}>🎮</span> Jogos
          </h1>
          <p style={{ fontSize: 14, color: '#8888aa', marginTop: 4 }}>Jogos e ferramentas dentro do Vortex</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => g.status === 'live' && router.push(g.path)}
              disabled={g.status === 'soon'}
              style={{
                textAlign: 'left',
                borderRadius: 12,
                border: g.status === 'live' ? '1px solid rgba(200,242,60,0.15)' : '1px solid rgba(200,242,60,0.05)',
                background: g.status === 'live' ? '#111118' : '#0f0e17',
                padding: 20,
                cursor: g.status === 'live' ? 'pointer' : 'not-allowed',
                opacity: g.status === 'soon' ? 0.6 : 1,
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (g.status === 'live') {
                  e.currentTarget.style.borderColor = 'rgba(200,242,60,0.4)'
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(200,242,60,0.1)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(200,242,60,0.15)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {g.status === 'soon' && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
                  background: 'rgba(200,242,60,0.1)', color: '#c8f23c',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  Em breve
                </span>
              )}
              <div style={{ fontSize: 32, marginBottom: 12 }}>{g.icon}</div>
              <h3 style={{ fontWeight: 700, color: '#f0f0f8', marginBottom: 4, fontSize: 16 }}>{g.name}</h3>
              <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.5 }}>{g.desc}</p>
            </button>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) {
          .games-main { padding-left: 16px !important; }
        }
      `}</style>
    </div>
  )
}