'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '../../components/Nav'

type FormatType = 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'formatBlock'

export default function NewPostPage() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [charCount, setCharCount] = useState(0)

  const fileRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const communityId = searchParams.get('community')
  const supabase = createClient()

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  function updateActiveFormats() {
    const formats = new Set<string>()
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough')
    setActiveFormats(formats)
  }

  function execFormat(command: FormatType, value?: string) {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand(command, false, value)
      updateActiveFormats()
    }
  }

  function handleEditorInput() {
    updateActiveFormats()
    const text = editorRef.current?.innerText || ''
    setCharCount(text.length)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          execFormat('bold')
          break
        case 'i':
          e.preventDefault()
          execFormat('italic')
          break
        case 'u':
          e.preventDefault()
          // no underline — use strikethrough as alt
          execFormat('strikeThrough')
          break
      }
    }
    // Tab → indent in lists
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;')
    }
  }

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

    const htmlContent = editorRef.current?.innerHTML || ''
    const textContent = editorRef.current?.innerText?.trim() || ''

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let mediaUrl = null

    if (image) {
      setUploading(true)
      const ext = image.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('posts').upload(path, image)
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
      content: textContent,        // plain text for feed preview
      html_content: htmlContent,   // rich HTML for full post view
      author_id: user.id,
      community_id: communityId || null,
      type: image ? 'image' : 'text',
      media_url: mediaUrl,
    })

    if (postError) {
      // fallback: try without html_content if column doesn't exist yet
      const { error: fallbackError } = await supabase.from('posts').insert({
        title: title.trim(),
        content: textContent,
        author_id: user.id,
        community_id: communityId || null,
        type: image ? 'image' : 'text',
        media_url: mediaUrl,
      })
      if (fallbackError) {
        setError(fallbackError.message)
        setLoading(false)
        return
      }
    }

    router.push('/feed')
  }

  const toolbarBtn = (
    active: boolean,
    onClick: () => void,
    title: string,
    children: React.ReactNode
  ) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      style={{
        background: active ? 'rgba(200,242,60,0.15)' : 'transparent',
        border: `1px solid ${active ? 'rgba(200,242,60,0.5)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#c8f23c' : '#8888aa',
        borderRadius: 8,
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: "'Syne', sans-serif",
        fontWeight: 600,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 32,
        height: 32,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'
          e.currentTarget.style.color = '#c8f23c'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#8888aa'
        }
      }}
    >
      {children}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: 'max(16px, calc(220px + 32px))'
        }}>
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
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {/* Title */}
          <div style={{ padding: '20px 20px 0' }}>
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
          </div>

          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {toolbarBtn(activeFormats.has('bold'), () => execFormat('bold'), 'Negrito (Ctrl+B)',
              <strong style={{ fontFamily: 'serif' }}>B</strong>
            )}
            {toolbarBtn(activeFormats.has('italic'), () => execFormat('italic'), 'Itálico (Ctrl+I)',
              <em style={{ fontFamily: 'serif' }}>I</em>
            )}
            {toolbarBtn(activeFormats.has('strikeThrough'), () => execFormat('strikeThrough'), 'Tachado',
              <span style={{ textDecoration: 'line-through' }}>S</span>
            )}

            {/* divider */}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {toolbarBtn(false, () => execFormat('insertUnorderedList'), 'Lista com marcadores',
              <span>≡ •</span>
            )}
            {toolbarBtn(false, () => execFormat('insertOrderedList'), 'Lista numerada',
              <span>≡ 1</span>
            )}

            {/* divider */}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {toolbarBtn(false, () => execFormat('formatBlock', 'h2'), 'Título H2',
              <span style={{ fontSize: 11, fontWeight: 800 }}>H2</span>
            )}
            {toolbarBtn(false, () => execFormat('formatBlock', 'h3'), 'Título H3',
              <span style={{ fontSize: 11, fontWeight: 800 }}>H3</span>
            )}
            {toolbarBtn(false, () => execFormat('formatBlock', 'blockquote'), 'Citação',
              <span style={{ fontFamily: 'serif', fontSize: 15 }}>"</span>
            )}
            {toolbarBtn(false, () => execFormat('formatBlock', 'p'), 'Parágrafo normal',
              <span style={{ fontSize: 11 }}>¶</span>
            )}

            {/* divider */}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

            {/* Link button */}
            {toolbarBtn(false, () => {
              const url = prompt('URL do link:')
              if (url) {
                editorRef.current?.focus()
                document.execCommand('createLink', false, url)
              }
            }, 'Inserir link',
              <span style={{ fontSize: 13 }}>🔗</span>
            )}

            {/* Image button */}
            {toolbarBtn(false, () => fileRef.current?.click(), 'Adicionar imagem',
              <span style={{ fontSize: 13 }}>🖼</span>
            )}

            <span style={{ marginLeft: 'auto', color: '#444466', fontSize: 12 }}>
              {charCount} chars
            </span>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            data-placeholder="Escreva algo... (opcional)"
            style={{
              minHeight: 220,
              padding: '16px 20px',
              color: '#c8c8dd',
              fontSize: 15,
              lineHeight: 1.75,
              outline: 'none',
              fontFamily: "'Syne', sans-serif",
              wordBreak: 'break-word',
            }}
          />

          {/* Image preview */}
          {imagePreview && (
            <div style={{ position: 'relative', margin: '0 20px 16px' }}>
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
                  borderRadius: 50, width: 28, height: 28, cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
        </div>

        {error && (
          <p style={{ color: '#ff4466', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        {/* Shortcuts hint */}
        <p style={{ color: '#333355', fontSize: 12, marginTop: 10, textAlign: 'right' }}>
          Ctrl+B negrito · Ctrl+I itálico · Tab indentar
        </p>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #333355; }

        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #333355;
          pointer-events: none;
        }

        [contenteditable] h2 {
          font-size: 20px; font-weight: 800; color: #f0f0f8;
          margin: 16px 0 8px; line-height: 1.3;
        }
        [contenteditable] h3 {
          font-size: 17px; font-weight: 700; color: #f0f0f8;
          margin: 14px 0 6px; line-height: 1.3;
        }
        [contenteditable] blockquote {
          border-left: 3px solid rgba(200,242,60,0.5);
          padding: 4px 0 4px 14px;
          margin: 12px 0;
          color: #8888aa;
          font-style: italic;
        }
        [contenteditable] ul {
          padding-left: 22px; margin: 8px 0;
        }
        [contenteditable] ol {
          padding-left: 22px; margin: 8px 0;
        }
        [contenteditable] li { margin: 3px 0; }
        [contenteditable] a {
          color: #c8f23c;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        [contenteditable] strong { color: #f0f0f8; font-weight: 700; }
        [contenteditable] em { color: #aaaacc; }
        [contenteditable] s { color: #555577; }

        @media (max-width: 767px) {
          main, header > div { padding-left: 16px !important; }
        }
      `}</style>
    </div>
  )
}