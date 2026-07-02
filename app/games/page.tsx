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
    <div className="min-h-screen bg-[#0b0a12] text-gray-200">
      <Nav />

      <main className="max-w-5xl mx-auto px-4 py-8 md:pl-24">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400">🎮</span> Jogos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Jogos e ferramentas dentro do Vortex</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => g.status === 'live' && router.push(g.path)}
              disabled={g.status === 'soon'}
              className={`text-left rounded-xl border p-5 transition relative overflow-hidden ${
                g.status === 'live'
                  ? 'border-purple-900/40 bg-[#12101c] hover:border-purple-600/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] cursor-pointer'
                  : 'border-purple-950/30 bg-[#0f0e17] opacity-60 cursor-not-allowed'
              }`}
            >
              {g.status === 'soon' && (
                <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wide bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">
                  Em breve
                </span>
              )}
              <div className="text-3xl mb-3">{g.icon}</div>
              <h3 className="font-semibold text-white mb-1">{g.name}</h3>
              <p className="text-xs text-gray-500">{g.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}