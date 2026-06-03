'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../../components/Nav'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem deve ter no máximo 5MB.')
      return
    }
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let mediaUrl = null

    if (image) {
      setUploading(true)
      const ext = image.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(path, image)

      if (uploadError) {
        setError('Erro ao fazer upload da imagem.')
        setLoading(false)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      setUploading(false)
    }

    const { error: postError } = await supabase.from('posts').insert({
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      type: image ? 'image' : 'text',
      media_url: mediaUrl,
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
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
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
          >
            {uploading ? 'Enviando...' : loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16
        }}>
          {/* Título */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Título da publicação"
            maxLength={200}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f8', fontSize: 20, fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              padding: '0 0 16px 0', outline: 'none', boxSizing: 'border-box'
            }}
            onFocus={e => (e.target.style.borderBottomColor = 'rgba(200,242,60,0.4)')}
            onBlur={e => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.08)')}
          />

          {/* Conteúdo */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva algo... (opcional)"
            rows={6}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: '#8888aa', fontSize: 15, fontFamily: "'Syne', sans-serif",
              outline: 'none', resize: 'none', lineHeight: 1.7, boxSizing: 'border-box'
            }}
          />

          {/* Preview da imagem */}
          {imagePreview && (
            <div style={{ position: 'relative' }}>
              <img
                src={imagePreview}
                alt="preview"
                style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'cover' }}
              />
              <button
                onClick={() => { setImage(null); setImagePreview(null) }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                  borderRadius: 50, width: 28, height: 28, cursor: 'pointer', fontSize: 14
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Barra de ferramentas */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)'
          }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#8888aa', padding: '7px 14px', borderRadius: 50, cursor: 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.4)'; e.currentTarget.style.color = '#c8f23c' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888aa' }}
            >
              🖼 Imagem
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />

            <span style={{ color: '#333355', fontSize: 12, marginLeft: 'auto' }}>
              {title.length}/200
            </span>
          </div>
        </div>

        {error && (
          <p style={{ color: '#ff4466', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder, textarea::placeholder { color: #333355; }
        @media (max-width: 767px) {
          main, header > div { padding-left: 16px !important; }
        }
      `}</style>
    </div>
  )
}