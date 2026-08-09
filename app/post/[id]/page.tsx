'use client'

import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '../../components/Nav'
import RippleButton from '../../components/RippleButton'
import Image from 'next/image'

type PlanId = 'free' | 'boost' | 'mega'

type Post = {
  id: string
  title: string
  content: string
  html_content: string | null
  media_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null; plan: PlanId; accent_color: string | null } | null
}

type Comment = {
  id: string
  content: string
  created_at: string
  author_id: string
  parent_id: string | null
  profiles: { username: string; avatar_url: string | null } | null
  replies?: Comment[]
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)
}

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<{ username: string; avatar_url: string | null }[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const postId = params.id as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: postData } = await supabase
        .from('posts')
        .select('id, title, content, html_content, media_url, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url, plan, accent_color)')
        .eq('id', postId)
        .single()
      setPost(postData as unknown as Post)

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, parent_id, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      const flat = (commentsData as unknown as Comment[]) || []
      const map: Record<string, Comment> = {}
      const roots: Comment[] = []
      flat.forEach((c: Comment) => { map[c.id] = { ...c, replies: [] } })
      flat.forEach((c: Comment) => {
        if (c.parent_id && map[c.parent_id]) {
          map[c.parent_id].replies!.push(map[c.id])
        } else {
          roots.push(map[c.id])
        }
      })
      setComments(roots)
      setLoading(false)
    }
    load()
  }, [postId])

  // Meta / título dinâmico (SEO básico do lado do cliente)
  useEffect(() => {
    if (!post) return
    document.title = `${post.title} — VORTEX`
    const desc = post.content?.slice(0, 150) || 'Confira essa publicação no VORTEX.'
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      document.head.appendChild(metaDesc)
    }
    metaDesc.setAttribute('content', desc)

    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (!ogTitle) {
      ogTitle = document.createElement('meta')
      ogTitle.setAttribute('property', 'og:title')
      document.head.appendChild(ogTitle)
    }
    ogTitle.setAttribute('content', post.title)

    let ogDesc = document.querySelector('meta[property="og:description"]')
    if (!ogDesc) {
      ogDesc = document.createElement('meta')
      ogDesc.setAttribute('property', 'og:description')
      document.head.appendChild(ogDesc)
    }
    ogDesc.setAttribute('content', desc)

    if (post.media_url && !isVideo(post.media_url)) {
      let ogImage = document.querySelector('meta[property="og:image"]')
      if (!ogImage) {
        ogImage = document.createElement('meta')
        ogImage.setAttribute('property', 'og:image')
        document.head.appendChild(ogImage)
      }
      ogImage.setAttribute('content', post.media_url)
    }
  }, [post])

  useEffect(() => {
    if (mentionQuery === null) { setMentionResults([]); return }
    if (mentionQuery === '') { setMentionResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .ilike('username', `${mentionQuery}%`)
        .limit(5)
      setMentionResults(data || [])
      setMentionIndex(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [mentionQuery])

  function handleCommentInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNewComment(val)
    const cursor = e.target.selectionStart
    const textBefore = val.slice(0, cursor)
    const match = textBefore.match(/@(\w*)$/)
    if (match) setMentionQuery(match[1])
    else setMentionQuery(null)
  }

  function insertMention(username: string) {
    const cursor = textareaRef.current?.selectionStart || newComment.length
    const textBefore = newComment.slice(0, cursor)
    const textAfter = newComment.slice(cursor)
    const replaced = textBefore.replace(/@\w*$/, `@${username} `)
    setNewComment(replaced + textAfter)
    setMentionQuery(null)
    setMentionResults([])
    setTimeout(() => {
      textareaRef.current?.focus()
      const pos = replaced.length
      textareaRef.current?.setSelectionRange(pos, pos)
    }, 0)
  }

  function handleCommentKeyDown(e: React.KeyboardEvent) {
    if (mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, mentionResults.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIndex].username); return }
      if (e.key === 'Escape') { setMentionQuery(null); setMentionResults([]) }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && mentionResults.length === 0) {
      handleComment()
    }
  }

  async function handleComment() {
    if (!newComment.trim() || !userId) return
    setSubmitting(true)

    const { data, error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: userId,
      content: newComment.trim(),
      parent_id: replyTo?.id || null,
    }).select('id, content, created_at, author_id, parent_id, profiles(username, avatar_url)').single()

    if (!error && data) {
      const newC: Comment = { ...(data as unknown as Comment), replies: [] }
      if (replyTo) {
        const replyToId = replyTo.id
        setComments(prev => {
          function addReply(list: Comment[]): Comment[] {
            return list.map(c => c.id === replyToId
              ? { ...c, replies: [...(c.replies || []), newC] }
              : { ...c, replies: addReply(c.replies || []) }
            )
          }
          return addReply(prev)
        })
      } else {
        setComments(prev => [...prev, newC])
      }
      await supabase.from('posts').update({ comments_count: (post?.comments_count || 0) + 1 }).eq('id', postId)
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev)

      const mentions = [...newComment.matchAll(/@(\w+)/g)].map(m => m[1])
      for (const mention of mentions) {
        const { data: mentioned } = await supabase.from('profiles').select('id').eq('username', mention).single()
        if (mentioned && mentioned.id !== userId) {
          await supabase.from('notifications').insert({
            user_id: mentioned.id, actor_id: userId, type: 'mention', post_id: postId
          })
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientId: mentioned.id,
              title: 'Você foi mencionado',
              body: newComment.trim().slice(0, 120),
              url: `/post/${postId}`,
            }),
          }).catch(() => {})
        }
      }

      setNewComment('')
      setReplyTo(null)
    }
    setSubmitting(false)
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    function removeComment(list: Comment[]): Comment[] {
      return list.filter(c => c.id !== commentId).map(c => ({ ...c, replies: removeComment(c.replies || []) }))
    }
    setComments(prev => removeComment(prev))
    await supabase.from('posts').update({ comments_count: Math.max((post?.comments_count || 1) - 1, 0) }).eq('id', postId)
    setPost(prev => prev ? { ...prev, comments_count: Math.max(prev.comments_count - 1, 0) } : prev)
  }

  async function handleDeletePost() {
    if (!confirm('Deletar este post?')) return
    await supabase.from('posts').delete().eq('id', postId)
    router.push('/feed')
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  function renderContent(text: string) {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ color: '#c8f23c', cursor: 'pointer', fontWeight: 600 }} onClick={() => router.push(`/profile/${part.slice(1)}`)}>{part}</span>
        : part
    )
  }

  function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
    return (
      <div style={{ marginLeft: depth > 0 ? 28 : 0 }}>
        <div
          className="vtx-card"
          style={{
            background: '#111118',
            border: `1px solid ${depth > 0 ? 'rgba(200,242,60,0.08)' : 'rgba(255,255,255,0.06)'}`,
            borderLeft: depth > 0 ? '2px solid rgba(200,242,60,0.25)' : undefined,
            borderRadius: 14, padding: 14, marginBottom: 8,
            transition: 'border-color 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = depth > 0 ? 'rgba(200,242,60,0.2)' : 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = depth > 0 ? 'rgba(200,242,60,0.08)' : 'rgba(255,255,255,0.06)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                background: comment.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#000',
              }}>
                {comment.profiles?.avatar_url
                  ? <Image src={comment.profiles.avatar_url} alt="" fill sizes="26px" style={{ objectFit: 'cover' }} />
                  : getInitial(comment.profiles?.username || '?')
                }
              </div>
              <span
                onClick={() => router.push(`/profile/${comment.profiles?.username}`)}
                style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c8f23c')}
                onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
              >
                @{comment.profiles?.username}
              </span>
              <span style={{ color: '#444466', fontSize: 11 }}>{timeAgo(comment.created_at)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {depth < 2 && (
                <RippleButton
                  onClick={() => {
                    setReplyTo({ id: comment.id, username: comment.profiles?.username || '' })
                    setNewComment(`@${comment.profiles?.username} `)
                    textareaRef.current?.focus()
                  }}
                  className="vtx-btn"
                  rippleColor="rgba(200,242,60,0.25)"
                  style={{ background: 'none', border: 'none', color: '#444466', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", transition: 'color 0.2s', borderRadius: 6, padding: '2px 6px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#c8f23c')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444466')}
                >
                  ↩ Responder
                </RippleButton>
              )}
              {userId === comment.author_id && (
                <RippleButton
                  onClick={() => handleDeleteComment(comment.id)}
                  className="vtx-btn"
                  rippleColor="rgba(255,68,102,0.25)"
                  style={{ background: 'none', border: 'none', color: '#444466', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", transition: 'color 0.2s', borderRadius: 6, padding: '2px 6px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ff4466')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#444466')}
                >
                  ✕
                </RippleButton>
              )}
            </div>
          </div>
          <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>
            {renderContent(comment.content)}
          </p>
        </div>
        {(comment.replies || []).map(reply => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  if (!post) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Post não encontrado.</p>
    </div>
  )

  const authorPlan: PlanId = post.profiles?.plan || 'free'
  const hasAccent = authorPlan === 'boost' || authorPlan === 'mega'
  const isMega = authorPlan === 'mega'
  const accentColor = post.profiles?.accent_color || (authorPlan === 'mega' ? '#a78bfa' : '#c8f23c')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${hasAccent ? `${accentColor}33` : 'rgba(200,242,60,0.2)'}`,
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <RippleButton
            onClick={() => router.back()}
            className="vtx-btn"
            rippleColor="rgba(200,242,60,0.2)"
            style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif", borderRadius: 8, padding: '4px 8px' }}
          >
            ← Voltar
          </RippleButton>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>Post</span>
        </div>
      </header>

      <main style={{
        maxWidth: 680, margin: '0 auto',
        padding: '24px 16px 80px',
        paddingLeft: 'max(16px, calc(220px + 32px))',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        {/* Post */}
        <div className="vtx-card" style={{
          position: 'relative',
          background: '#111118',
          border: hasAccent ? `1px solid ${accentColor}44` : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: hasAccent ? `0 0 30px ${accentColor}14` : 'none',
        }}>
          {hasAccent && (
            <div className={isMega ? 'mega-strip' : undefined} style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}88, transparent)` }} />
          )}
          {isMega && (
            <div style={{
              position: 'absolute', top: 14, right: 14, zIndex: 2,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 50,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
              border: `1px solid ${accentColor}55`,
            }}>
              <span style={{ fontSize: 11 }}>👑</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: accentColor, textTransform: 'uppercase' }}>Premium</span>
            </div>
          )}

          {post.media_url && (
            isVideo(post.media_url) ? (
              <video src={post.media_url} controls style={{ width: '100%', maxHeight: 400, display: 'block', background: '#000' }} />
            ) : (
              <img src={post.media_url} alt="post" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
            )
          )}
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                  background: post.profiles?.avatar_url ? 'none' : hasAccent ? `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: 14,
                  boxShadow: hasAccent ? `0 0 12px ${accentColor}66` : '0 0 10px rgba(200,242,60,0.2)'
                }}>
                  {post.profiles?.avatar_url
                    ? <Image src={post.profiles.avatar_url} alt="avatar" fill sizes="36px" style={{ objectFit: 'cover' }} />
                    : getInitial(post.profiles?.username || '?')
                  }
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p onClick={() => router.push(`/profile/${post.profiles?.username}`)} style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, cursor: 'pointer', margin: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = hasAccent ? accentColor : '#c8f23c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
                    >@{post.profiles?.username}</p>
                    {authorPlan === 'boost' && <span style={{ fontSize: 12 }}>⚡</span>}
                    {authorPlan === 'mega' && <span style={{ fontSize: 12 }}>👑</span>}
                  </div>
                  <p style={{ color: '#555577', fontSize: 12, margin: 0 }}>{timeAgo(post.created_at)}</p>
                </div>
              </div>
              {userId === post.author_id && (
                <RippleButton
                  onClick={handleDeletePost}
                  className="vtx-btn"
                  rippleColor="rgba(255,68,102,0.25)"
                  style={{ background: 'transparent', border: '1px solid rgba(255,50,50,0.3)', color: '#ff4466', padding: '5px 12px', borderRadius: 50, cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,50,50,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >Deletar</RippleButton>
              )}
            </div>

            <h1 style={isMega ? {
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700,
              fontSize: 26, marginBottom: 14, lineHeight: 1.3, letterSpacing: '0.01em',
              backgroundImage: `linear-gradient(100deg, ${accentColor}, #f0f0f8 55%, ${accentColor})`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              WebkitTextFillColor: 'transparent',
              animation: 'megaShine 6s ease infinite',
            } : {
              color: hasAccent ? accentColor : '#f0f0f8', fontWeight: 800, fontSize: 22, marginBottom: 12, lineHeight: 1.3,
              textShadow: hasAccent ? `0 0 20px ${accentColor}33` : 'none',
            }}>{post.title}</h1>

            {post.html_content ? (
              <div
                data-rich
                className={isMega ? 'mega-content' : undefined}
                dangerouslySetInnerHTML={{ __html: post.html_content }}
                style={{ color: '#8888aa', fontSize: isMega ? 16 : 15, lineHeight: 1.7, marginBottom: 16, ...(isMega ? { '--mega-accent': accentColor } : {}) } as CSSProperties}
              />
            ) : post.content ? (
              <p className={isMega ? 'mega-content' : undefined} style={{ color: '#8888aa', fontSize: isMega ? 16 : 15, lineHeight: 1.7, marginBottom: 16, ...(isMega ? { '--mega-accent': accentColor } : {}) } as CSSProperties}>{post.content}</p>
            ) : null}

            <div style={{ display: 'flex', gap: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#555577', fontSize: 13 }}>▲ {post.likes_count} curtidas</span>
              <span style={{ color: '#555577', fontSize: 13 }}>💬 {post.comments_count} comentários</span>
            </div>
          </div>
        </div>

        {/* Caixa de comentário */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#8888aa', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            {replyTo ? `↩ Respondendo @${replyTo.username}` : 'Comentários'}
            {replyTo && (
              <RippleButton
                onClick={() => { setReplyTo(null); setNewComment('') }}
                className="vtx-btn"
                rippleColor="rgba(255,68,102,0.25)"
                style={{ marginLeft: 10, background: 'none', border: 'none', color: '#ff4466', cursor: 'pointer', fontSize: 11, borderRadius: 6, padding: '2px 6px' }}
              >cancelar</RippleButton>
            )}
          </p>

          <div style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleCommentInput}
              onKeyDown={handleCommentKeyDown}
              placeholder="Escreva um comentário... Use @ para mencionar"
              rows={3}
              style={{
                width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14,
                outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s'
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; setTimeout(() => setMentionResults([]), 150) }}
            />

            {mentionResults.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0,
                background: '#18181f', border: '1px solid rgba(200,242,60,0.3)',
                borderRadius: 10, overflow: 'hidden', zIndex: 50,
                boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
                marginBottom: 4,
              }}>
                {mentionResults.map((u, i) => (
                  <div
                    key={u.username}
                    onMouseDown={() => insertMention(u.username)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      cursor: 'pointer', background: i === mentionIndex ? 'rgba(200,242,60,0.1)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative',
                      background: u.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color: '#000',
                    }}>
                      {u.avatar_url ? <Image src={u.avatar_url} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} /> : u.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: i === mentionIndex ? '#c8f23c' : '#f0f0f8', fontSize: 14, fontWeight: 600 }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ color: '#333355', fontSize: 12 }}>Ctrl+Enter para enviar</span>
            <RippleButton
              onClick={handleComment}
              disabled={submitting || !newComment.trim()}
              className="vtx-btn-glow"
              rippleColor="rgba(0,0,0,0.25)"
              style={{
                background: '#c8f23c', color: '#000', fontWeight: 700,
                padding: '8px 20px', borderRadius: 50, border: 'none',
                cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif",
                boxShadow: '0 0 12px rgba(200,242,60,0.3)',
                opacity: submitting || !newComment.trim() ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              {submitting ? 'Enviando...' : 'Comentar'}
            </RippleButton>
          </div>
        </div>

        {/* Comentários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {comments.length === 0 && (
            <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '32px 0' }}>Nenhum comentário ainda. Seja o primeiro!</p>
          )}
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,700&display=swap');
        textarea::placeholder { color: #333355; }
        @keyframes megaShine { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        .mega-content::first-letter {
          font-family: 'Playfair Display', serif;
          font-style: italic;
          font-size: 3.4em;
          font-weight: 700;
          float: left;
          line-height: 0.8;
          padding: 4px 8px 0 0;
          color: var(--mega-accent, #a78bfa);
        }
        @media (max-width: 767px) { main, header > div { padding-left: 16px !important; } }
        [data-rich] h2 { font-size: 20px; font-weight: 800; color: #f0f0f8; margin: 16px 0 8px; }
        [data-rich] h3 { font-size: 17px; font-weight: 700; color: #f0f0f8; margin: 14px 0 6px; }
        [data-rich] blockquote { border-left: 3px solid rgba(200,242,60,0.5); padding: 4px 0 4px 14px; margin: 12px 0; color: #8888aa; font-style: italic; }
        [data-rich] ul, [data-rich] ol { padding-left: 22px; margin: 8px 0; }
        [data-rich] a { color: #c8f23c; text-decoration: underline; }
        [data-rich] strong { color: #f0f0f8; }
      `}</style>
    </div>
  )
}