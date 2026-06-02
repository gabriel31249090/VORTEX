'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha incorretos.')
    } else {
      router.push('/feed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-4xl font-black tracking-tighter text-white" style={{ fontFamily: 'sans-serif' }}>
            ◈ VORTEX
          </span>
          <p className="text-zinc-500 mt-2 text-sm">Bem-vindo de volta</p>
        </div>

        {/* Card */}
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-8 space-y-5">
          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] transition-colors"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#c8f23c] text-black font-bold py-3 rounded-xl hover:bg-[#d4f554] transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Não tem conta?{' '}
            <Link href="/register" className="text-[#c8f23c] hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}