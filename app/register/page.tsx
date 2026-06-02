'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    setLoading(true)
    setError('')

    if (username.length < 3) {
      setError('Username deve ter pelo menos 3 caracteres.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    // Verifica se username já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      setError('Este username já está em uso.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Cria o perfil
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        display_name: username,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-white text-2xl font-bold">Conta criada!</h2>
          <p className="text-zinc-400">Verifique seu email para confirmar a conta.</p>
          <Link href="/login" className="block text-[#c8f23c] hover:underline">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-4xl font-black tracking-tighter text-white">
            ◈ VORTEX
          </span>
          <p className="text-zinc-500 mt-2 text-sm">Crie sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-8 space-y-5">
          <div>
            <label className="text-zinc-400 text-sm mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="seunome"
              className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] transition-colors"
            />
          </div>

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
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              className="w-full bg-[#1c1c1f] border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#c8f23c] transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-[#c8f23c] text-black font-bold py-3 rounded-xl hover:bg-[#d4f554] transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Já tem conta?{' '}
            <Link href="/login" className="text-[#c8f23c] hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}