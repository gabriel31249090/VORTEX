'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type RippleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  rippleColor?: string
}

function RippleButton({ rippleColor, ...props }: RippleButtonProps) {
  return <button {...props} />
}

function Btn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <RippleButton
      onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); onClick() }}
      title={title}
      className="vtx-btn"
      rippleColor="rgba(200,242,60,0.25)"
      style={{
        background: active ? 'rgba(200,242,60,0.15)' : 'transparent',
        border: `1px solid ${active ? 'rgba(200,242,60,0.5)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#c8f23c' : '#8888aa',
        borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
        fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
        transition: 'all 0.15s', display: 'flex', alignItems: 'center',
        justifyContent: 'center', minWidth: 32, height: 32,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888aa' } }}
    >{children}</RippleButton>
  )
}

function MediaBtn({ label, emoji, onClick, active, limitMB, planLabel }: { label: string; emoji: string; onClick: () => void; active: boolean; limitMB: number; planLabel: string }) {
  return (
    <RippleButton
      onClick={onClick}
      title={`Máx. ${limitMB}MB (${planLabel})`}
      className="vtx-btn"
      rippleColor="rgba(200,242,60,0.25)"
      style={{
        background: active ? 'rgba(200,242,60,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#c8f23c' : '#8888aa',
        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
        fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8888aa' } }}
    >
      {emoji} {label}
      <span style={{ color: '#444466', fontSize: 10, marginLeft: 2 }}>{limitMB}MB</span>
    </RippleButton>
  )
}

type PlanId = 'free' | 'boost' | 'mega'
type FormatType = 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'formatBlock'
type MediaType = 'image' | 'video' | 'audio' | 'gif' | null

const UPLOAD_LIMITS: Record<PlanId, { image: number; video: number; audio: number; gif: number }> = {
  free:  { image: 2,   video: 10,  audio: 5,   gif: 2 },
  boost: { image: 10,  video: 100, audio: 50,  gif: 10 },
  mega:  { image: 50,  video: 500, audio: 200, gif: 50 },
}

// Cooldown entre posts, em segundos, por plano (só se aplica ao criar, não ao editar)
const POST_COOLDOWN: Record<PlanId, number> = {
  free: 60,
  boost: 20,
  mega: 5,
}

type PostEditorProps = {
  /** Se presente, o editor entra em modo edição e carrega esse post */
  postId?: string
  /** community pré-selecionada ao criar (vinda de ?community=) */
  communityId?: string | null
}

export default function PostEditor({ postId, communityId = null }: PostEditorProps) {
  const isEditing = !!postId

  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(isEditing)
  const [error, setError] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>(null)
  const [mediaRemoved, setMediaRemoved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [charCount, setCharCount] = useState(0)
  const [userPlan, setUserPlan] = useState<PlanId>('free')
  const [userId, setUserId] = useState<string | null>(null)
  const [cooldownLeft, setCooldownLeft] = useState(0)

  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLInputElement>(null)
  const gifRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    editorRef.current?.focus()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', user.id).single()
      const plan = (profile?.plan as PlanId) || 'free'
      setUserPlan(plan)

      if (isEditing) {
        const { data: existing } = await supabase
          .from('posts')
          .select('title, content, html_content, media_url, type, author_id')
          .eq('id', postId)
          .single()

        if (!existing || existing.author_id !== user.id) {
          router.push('/feed')
          return
        }

        setTitle(existing.title || '')
        if (editorRef.current) editorRef.current.innerHTML = existing.html_content || existing.content || ''
        setCharCount(editorRef.current?.innerText?.length || 0)
        if (existing.media_url) {
          setMediaPreview(existing.media_url)
          setMediaType((existing.type as MediaType) || 'image')
        }
        setInitializing(false)
        return
      }

      // Checa último post pra calcular cooldown (só ao criar)
      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastPost) {
        const secondsSince = (Date.now() - new Date(lastPost.created_at).getTime()) / 1000
        const remaining = Math.ceil(POST_COOLDOWN[plan] - secondsSince)
        if (remaining > 0) setCooldownLeft(remaining)
      }
    }
    init()
  }, [])

  // Contador regressivo do cooldown
  useEffect(() => {
    if (cooldownLeft <= 0) return
    const t = setInterval(() => setCooldownLeft(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldownLeft])

  function updateActiveFormats() {
    const formats = new Set<string>()
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough')
    setActiveFormats(formats)
  }

  function execFormat(command: FormatType, value?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    updateActiveFormats()
  }

  function handleEditorInput() {
    updateActiveFormats()
    setCharCount(editorRef.current?.innerText?.length || 0)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); execFormat('bold') }
      if (e.key.toLowerCase() === 'i') { e.preventDefault(); execFormat('italic') }
    }
    if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;') }
  }

  function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>, type: MediaType) {
    const file = e.target.files?.[0]
    if (!file || !type) return

    const limits = UPLOAD_LIMITS[userPlan]
    const limitMB = limits[type as keyof typeof limits]

    if (file.size > limitMB * 1024 * 1024) {
      const planNames: Record<PlanId, string> = { free: 'Free', boost: 'BOOST ⚡', mega: 'MEGA BOOST 👑' }
      setError(
        `Arquivo muito grande! Limite para ${type} no plano ${planNames[userPlan]}: ${limitMB}MB.` +
        (userPlan === 'free' ? ' Faça upgrade para enviar arquivos maiores.' : '')
      )
      return
    }

    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setMediaType(type)
    setMediaRemoved(false)
    setError('')
  }

  function clearMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setMediaRemoved(true)
  }

  async function handleSubmit() {
    if (!isEditing && cooldownLeft > 0) return
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    const htmlContent = editorRef.current?.innerHTML || ''
    const textContent = editorRef.current?.innerText?.trim() || ''
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (!isEditing) {
      // Revalida cooldown no momento do envio (evita burlar esperando a página aberta)
      const { data: lastPost } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastPost) {
        const secondsSince = (Date.now() - new Date(lastPost.created_at).getTime()) / 1000
        const remaining = Math.ceil(POST_COOLDOWN[userPlan] - secondsSince)
        if (remaining > 0) {
          setCooldownLeft(remaining)
          setError(`Aguarde ${remaining}s antes de publicar novamente.`)
          setLoading(false)
          return
        }
      }
    }

    // mediaUrl: null = sem mídia (removida ou nunca existiu); string = usa existente ou nova
    let mediaUrl: string | null = mediaRemoved ? null : mediaPreview
    let postType = mediaType || 'text'

    if (mediaFile && mediaType) {
      setUploading(true)
      const ext = mediaFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const bucket = mediaType === 'image' || mediaType === 'gif' ? 'posts' : 'media'
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, mediaFile)
      if (uploadError) {
        setError('Erro ao fazer upload: ' + uploadError.message)
        setLoading(false)
        setUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      postType = mediaType
      setUploading(false)
    }

    const moderateResponse = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), content: textContent }),
    })
    const moderation = await moderateResponse.json()

    if (moderation.action === 'reject') {
      setError(moderation.reason || 'Conteúdo rejeitado pela moderação.')
      setLoading(false)
      return
    }

    const moderationStatus = moderation.action === 'review' ? 'review' : 'approved'

    if (isEditing) {
      const { error: updateError } = await supabase.from('posts').update({
        title: title.trim(),
        content: textContent,
        html_content: htmlContent,
        type: mediaUrl ? postType : 'text',
        media_url: mediaUrl,
        moderation_status: moderationStatus,
        moderation_reason: moderation.reason,
        moderation_details: moderation.labels || null,
      }).eq('id', postId)

      if (updateError) { setError(updateError.message); setLoading(false); return }
      router.push(`/post/${postId}`)
      return
    }

    const { error: postError } = await supabase.from('posts').insert({
      title: title.trim(),
      content: textContent,
      html_content: htmlContent,
      author_id: user.id,
      community_id: communityId || null,
      type: postType,
      media_url: mediaUrl,
      moderation_status: moderationStatus,
      moderation_reason: moderation.reason,
      moderation_details: moderation.labels || null,
    })

    if (postError) {
      const { error: fallbackError } = await supabase.from('posts').insert({
        title: title.trim(),
        content: textContent,
        author_id: user.id,
        community_id: communityId || null,
        type: postType,
        media_url: mediaUrl,
        moderation_status: moderationStatus,
        moderation_reason: moderation.reason,
        moderation_details: moderation.labels || null,
      })
      if (fallbackError) { setError(fallbackError.message); setLoading(false); return }
    }

    router.push(communityId ? `/community/${communityId}` : '/feed')
  }

  const limits = UPLOAD_LIMITS[userPlan]
  const planColor = userPlan === 'mega' ? '#a78bfa' : userPlan === 'boost' ? '#c8f23c' : '#555577'
  const planLabel = userPlan === 'mega' ? '👑 MEGA BOOST' : userPlan === 'boost' ? '⚡ BOOST' : 'Free'

  const isBlocked = !isEditing && cooldownLeft > 0

  if (initializing) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(200,242,60,0.2)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <RippleButton
            onClick={() => router.push(isEditing ? `/post/${postId}` : '/feed')}
            className="vtx-btn"
            rippleColor="rgba(200,242,60,0.2)"
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif", borderRadius: 8, padding: '4px 8px' }}
          >← Voltar</RippleButton>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>{isEditing ? 'Editar publicação' : 'Nova publicação'}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50,
              background: userPlan !== 'free' ? `rgba(${userPlan === 'mega' ? '167,139,250' : '200,242,60'},0.12)` : 'transparent',
              border: userPlan !== 'free' ? `1px solid ${planColor}40` : 'none',
              color: planColor,
            }}>
              {planLabel}
            </span>
          </div>
          <RippleButton
            onClick={handleSubmit}
            disabled={loading || isBlocked}
            className={isBlocked ? 'vtx-btn' : 'vtx-btn-glow'}
            rippleColor="rgba(0,0,0,0.25)"
            style={{
              background: isBlocked ? 'rgba(255,255,255,0.06)' : '#c8f23c',
              color: isBlocked ? '#555577' : '#000', fontWeight: 700,
              padding: '8px 18px', borderRadius: 50, border: 'none',
              cursor: isBlocked ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif",
              boxShadow: isBlocked ? 'none' : '0 0 12px rgba(200,242,60,0.4)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {isBlocked ? `⏳ ${cooldownLeft}s` : uploading ? 'Enviando...' : loading ? (isEditing ? 'Salvando...' : 'Publicando...') : (isEditing ? 'Salvar' : 'Publicar')}
          </RippleButton>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        {isBlocked && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(255,200,0,0.06)', border: '1px solid rgba(255,200,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>⏳</span>
            <span style={{ color: '#ffc800', fontSize: 13 }}>
              Aguarde <strong>{cooldownLeft}s</strong> antes de publicar de novo.
              {userPlan === 'free' && ' Usuários BOOST e MEGA BOOST têm intervalos menores entre posts.'}
            </span>
          </div>
        )}

        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>

          <div style={{ padding: '20px 20px 0' }}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da publicação" maxLength={200}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#f0f0f8', fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif", padding: '0 0 16px 0', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.target.style.borderBottomColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => (e.target.style.borderBottomColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Btn active={activeFormats.has('bold')} onClick={() => execFormat('bold')} title="Negrito (Ctrl+B)"><strong style={{ fontFamily: 'serif' }}>B</strong></Btn>
            <Btn active={activeFormats.has('italic')} onClick={() => execFormat('italic')} title="Itálico (Ctrl+I)"><em style={{ fontFamily: 'serif' }}>I</em></Btn>
            <Btn active={activeFormats.has('strikeThrough')} onClick={() => execFormat('strikeThrough')} title="Tachado"><span style={{ textDecoration: 'line-through' }}>S</span></Btn>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <Btn active={false} onClick={() => execFormat('insertUnorderedList')} title="Lista"><span>≡ •</span></Btn>
            <Btn active={false} onClick={() => execFormat('insertOrderedList')} title="Lista numerada"><span>≡ 1</span></Btn>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <Btn active={false} onClick={() => execFormat('formatBlock', 'h2')} title="H2"><span style={{ fontSize: 11, fontWeight: 800 }}>H2</span></Btn>
            <Btn active={false} onClick={() => execFormat('formatBlock', 'h3')} title="H3"><span style={{ fontSize: 11, fontWeight: 800 }}>H3</span></Btn>
            <Btn active={false} onClick={() => execFormat('formatBlock', 'blockquote')} title="Citação"><span style={{ fontFamily: 'serif', fontSize: 15 }}>&quot;</span></Btn>
            <Btn active={false} onClick={() => execFormat('formatBlock', 'p')} title="Parágrafo"><span style={{ fontSize: 11 }}>¶</span></Btn>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <Btn active={false} onClick={() => { const url = prompt('URL do link:'); if (url) { editorRef.current?.focus(); document.execCommand('createLink', false, url) } }} title="Link"><span>🔗</span></Btn>
            <span style={{ marginLeft: 'auto', color: '#444466', fontSize: 12 }}>{charCount} chars</span>
          </div>

          <div ref={editorRef} contentEditable suppressContentEditableWarning
            onInput={handleEditorInput} onKeyDown={handleKeyDown} onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats} onFocus={updateActiveFormats}
            data-placeholder="Escreva algo... (opcional)"
            style={{ minHeight: 180, padding: '16px 20px', color: '#c8c8dd', fontSize: 15, lineHeight: 1.75, outline: 'none', fontFamily: "'Syne', sans-serif", wordBreak: 'break-word' }}
          />

          {mediaPreview && (
            <div style={{ position: 'relative', margin: '0 20px 16px' }}>
              {mediaType === 'video' && <video src={mediaPreview} controls style={{ width: '100%', borderRadius: 12, maxHeight: 300, background: '#000' }} />}
              {(mediaType === 'image' || mediaType === 'gif') && <img src={mediaPreview} alt="preview" style={{ width: '100%', borderRadius: 12, maxHeight: 400, objectFit: 'cover' }} />}
              {mediaType === 'audio' && (
                <div style={{ background: '#18181f', borderRadius: 12, padding: '16px 20px' }}>
                  <p style={{ color: '#8888aa', fontSize: 13, marginBottom: 8 }}>🎵 {mediaFile?.name || 'arquivo de áudio'}</p>
                  <audio src={mediaPreview} controls style={{ width: '100%' }} />
                </div>
              )}
              <RippleButton onClick={clearMedia} className="vtx-btn" rippleColor="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: 50, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</RippleButton>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, padding: '12px 20px 16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <MediaBtn label="Imagem" emoji="🖼" onClick={() => imageRef.current?.click()} active={mediaType === 'image'} limitMB={limits.image} planLabel={planLabel} />
            <MediaBtn label="Vídeo" emoji="🎬" onClick={() => videoRef.current?.click()} active={mediaType === 'video'} limitMB={limits.video} planLabel={planLabel} />
            <MediaBtn label="Áudio" emoji="🎵" onClick={() => audioRef.current?.click()} active={mediaType === 'audio'} limitMB={limits.audio} planLabel={planLabel} />
            <MediaBtn label="GIF" emoji="🎭" onClick={() => gifRef.current?.click()} active={mediaType === 'gif'} limitMB={limits.gif} planLabel={planLabel} />
          </div>

          <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleMediaSelect(e, 'image')} style={{ display: 'none' }} />
          <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => handleMediaSelect(e, 'video')} style={{ display: 'none' }} />
          <input ref={audioRef} type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/mp4" onChange={e => handleMediaSelect(e, 'audio')} style={{ display: 'none' }} />
          <input ref={gifRef} type="file" accept="image/gif" onChange={e => handleMediaSelect(e, 'gif')} style={{ display: 'none' }} />
        </div>

        {error && (
          <div style={{
            color: '#ff4466', fontSize: 13, marginTop: 12,
            background: 'rgba(255,68,102,0.08)', border: '1px solid rgba(255,68,102,0.2)',
            borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span>⚠️</span>
            <span>{error}</span>
            {error.includes('upgrade') && (
              <RippleButton
                onClick={() => router.push('/pricing')}
                className="vtx-btn-glow"
                rippleColor="rgba(0,0,0,0.25)"
                style={{ marginLeft: 'auto', background: '#c8f23c', color: '#000', border: 'none', borderRadius: 50, padding: '3px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Syne', sans-serif", whiteSpace: 'nowrap' }}
              >
                Ver planos
              </RippleButton>
            )}
          </div>
        )}

        <p style={{ color: '#333355', fontSize: 12, marginTop: 10, textAlign: 'right' }}>
          Ctrl+B negrito · Ctrl+I itálico · Tab indentar
        </p>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #333355; }
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #333355; pointer-events: none; }
        [contenteditable] h2 { font-size: 20px; font-weight: 800; color: #f0f0f8; margin: 16px 0 8px; }
        [contenteditable] h3 { font-size: 17px; font-weight: 700; color: #f0f0f8; margin: 14px 0 6px; }
        [contenteditable] blockquote { border-left: 3px solid rgba(200,242,60,0.5); padding: 4px 0 4px 14px; margin: 12px 0; color: #8888aa; font-style: italic; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 22px; margin: 8px 0; }
        [contenteditable] li { margin: 3px 0; }
        [contenteditable] a { color: #c8f23c; text-decoration: underline; }
        [contenteditable] strong { color: #f0f0f8; font-weight: 700; }
        [contenteditable] em { color: #aaaacc; }
        [contenteditable] s { color: #555577; }
        audio { accent-color: #c8f23c; }
        @media (max-width: 767px) { main, header > div { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}