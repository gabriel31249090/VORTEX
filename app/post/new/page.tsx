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
    if (!user) { router.push('/login'); return }

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
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
          >
            ← Voltar
          </button>
          <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>Nova publicação</span>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: '#c8f23c', color: '#000', fontWeight: 700,
              padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: "'Syne', sans-serif",
              boxShadow: '0 0 12px rgba(200,242,60,0.4)',
              transition: 'all 0.2s', opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.7)' }}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(200,242,60,0.4)')}
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 24
        }}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da publicação"
            maxLength={200}
            style={{
              width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f8', fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              padding: '0 0 16px 0', marginBottom: 20, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => (e.target.style.borderBottomColor = 'rgba(200,242,60,0.4)')}
            onBlur={e => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.08)')}
          />

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva algo... (opcional)"
            rows={10}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: '#8888aa', fontSize: 15, fontFamily: "'Syne', sans-serif",
              outline: 'none', resize: 'none', lineHeight: 1.7, boxSizing: 'border-box'
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#ff4466', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
      `}</style>
    </div>
  )
}