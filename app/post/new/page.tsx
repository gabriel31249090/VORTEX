'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    if (!title.trim()) {
      setError('O título é obrigatório.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: postError } = await supabase.from('posts').insert({
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      type: 'text',
    })

    if (postError) {
      setError(postError.message)
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      <header className="sticky top-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/feed')}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
          <span className="text-white font-bold">Nova publicação</span>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#c8f23c] text-black text-sm font-bold px-4 py-1.5 rounded-full hover:bg-[#d4f554] transition-colors disabled:opacity-50"
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-[#141416] border border-zinc-800 rounded-2xl p-5 space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da publicação"
            maxLength={200}
            className="w-full bg-transparent text-white text-xl font-semibold placeholder-zinc-600 focus:outline-none border-b border-zinc-800 pb-4"
          />

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva algo... (opcional)"
            rows={8}
            className="w-full bg-transparent text-zinc-300 placeholder-zinc-600 focus:outline-none resize-none"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </main>
    </div>
  )
}