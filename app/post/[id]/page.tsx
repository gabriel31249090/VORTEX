'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '../../components/Nav'

type Post = {
  id: string
  title: string
  content: string
  html_content: string | null
  media_url: string | null
  type: string
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

type Comment = {
  id: string
  content: string
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

export default function PostPage() {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
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
        .select('id, title, content, html_content, media_url, type, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url)')
        .eq('id', postId)
        .single()

      setPost(postData as any)

      const { data: likeData } = await supabase
        .from('likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
      setLiked(!!likeData)

      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, created_at, author_id, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      setComments((commentsData as any) || [])
      setLoading(false)
    }
    load()
  }, [postId])

  async function handleLike() {
    if (!userId || !post) return
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('posts').update({ likes_count: post.likes_count - 1 }).eq('id', postId)
      setLiked(false)
      setPost(prev => prev ? { ...prev, likes_count: prev.likes_count - 1 } : prev)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId)
      setLiked(true)
      setPost(prev => prev ? { ...prev, likes_count: prev.likes_count + 1 } : prev)
    }
  }

  async function handleComment() {
    if (!newComment.trim() || !userId) return
    setSubmitting(true)

    const { data, error } = await supabase.from('comments').insert({
      post_id: postId,
      author_id: userId,
      content: newComment.trim()
    }).select('id, content, created_at, author_id, profiles(username, avatar_url)').single()

    if (!error && data) {
      setComments(prev => [...prev, data as any])
      await supabase.from('posts').update({ comments_count: (post?.comments_count || 0) + 1 }).eq('id', postId)
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev)
      setNewComment('')
    }
    setSubmitting(false)
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
    await supabase.from('posts').update({ comments_count: Math.max((post?.comments_count || 1) - 1, 0) }).eq('id', postId)
    setPost(prev => prev ? { ...prev, comments_count: Math.max(prev.comments_count - 1, 0) } : prev)
  }

  async function handleDeletePost() {
    if (!confirm('Deletar este post?')) return
    await supabase.from('comments').delete().eq('post_id', postId)
    await supabase.from('likes').delete().eq('post_id', postId)
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 'max(16px, calc(220px + 32px))' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8888aa')}
          >← Voltar</button>
          <span style={{ color: '#f0f0f8', fontWeight: 700 }}>Post</span>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Post card */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>

          {/* Mídia */}
          {post.media_url && (
            isVideo(post.media_url)
              ? <video src={post.media_url} controls style={{ width: '100%', maxHeight: 480, display: 'block', background: '#000' }} />
              : <img src={post.media_url} alt="post" style={{ width: '100%', maxHeight: 480, objectFit: 'cover', display: 'block' }} />
          )}

          <div style={{ padding: 20 }}>
            {/* Autor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: post.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 800, fontSize: 14, flexShrink: 0,
                  overflow: 'hidden', boxShadow: '0 0 10px rgba(200,242,60,0.2)'
                }}>
                  {post.profiles?.avatar_url
                    ? <img src={post.profiles.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitial(post.profiles?.username || '?')
                  }
                </div>
                <div>
                  <p onClick={() => router.push(`/profile/${post.profiles?.username}`)}
                    style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#c8f23c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
                  >@{post.profiles?.username || 'usuário'}</p>
                  <p style={{ color: '#555577', fontSize: 12 }}>{timeAgo(post.created_at)}</p>
                </div>
              </div>
              {userId === post.author_id && (
                <button onClick={handleDeletePost}
                  style={{ background: 'transparent', border: '1px solid rgba(255,50,50,0.3)', color: '#ff4466', padding: '5px 12px', borderRadius: 50, cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,50,50,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >Deletar</button>
              )}
            </div>

            {/* Título */}
            <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 22, marginBottom: 16, lineHeight: 1.3 }}>{post.title}</h1>

            {/* Conteúdo — HTML rico se disponível, senão texto puro */}
            {post.html_content ? (
              <div
                className="post-content"
                dangerouslySetInnerHTML={{ __html: post.html_content }}
                style={{ color: '#8888aa', fontSize: 15, lineHeight: 1.75, marginBottom: 16 }}
              />
            ) : post.content ? (
              <p style={{ color: '#8888aa', fontSize: 15, lineHeight: 1.75, marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                {post.content}
              </p>
            ) : null}

            {/* Ações */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={handleLike}
                style={{
                  background: liked ? 'rgba(200,242,60,0.12)' : 'transparent',
                  border: `1px solid ${liked ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: liked ? '#c8f23c' : '#555577',
                  padding: '6px 16px', borderRadius: 50, cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  transition: 'all 0.2s',
                  boxShadow: liked ? '0 0 10px rgba(200,242,60,0.2)' : 'none'
                }}
              >▲ {post.likes_count}</button>
              <span style={{ color: '#555577', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                💬 {post.comments_count} comentários
              </span>
            </div>
          </div>
        </div>

        {/* Caixa de comentário */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <p style={{ color: '#8888aa', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Comentários</p>
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
            style={{ width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none', fontFamily: "'Syne', sans-serif", resize: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(200,242,60,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              onClick={handleComment}
              disabled={submitting || !newComment.trim()}
              style={{
                background: '#c8f23c', color: '#000', fontWeight: 700,
                padding: '8px 20px', borderRadius: 50, border: 'none',
                cursor: submitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif",
                boxShadow: '0 0 12px rgba(200,242,60,0.3)',
                opacity: submitting || !newComment.trim() ? 0.5 : 1, transition: 'all 0.2s'
              }}
            >{submitting ? 'Enviando...' : 'Comentar'}</button>
          </div>
        </div>

        {/* Comentários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.length === 0 && (
            <p style={{ textAlign: 'center', color: '#333355', fontSize: 14, padding: '32px 0' }}>Nenhum comentário ainda.</p>
          )}
          {comments.map(comment => (
            <div key={comment.id}
              style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: comment.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 800, fontSize: 11, overflow: 'hidden', flexShrink: 0
                  }}>
                    {comment.profiles?.avatar_url
                      ? <img src={comment.profiles.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitial(comment.profiles?.username || '?')
                    }
                  </div>
                  <div>
                    <span onClick={() => router.push(`/profile/${comment.profiles?.username}`)}
                      style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#c8f23c')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
                    >@{comment.profiles?.username || 'usuário'}</span>
                    <span style={{ color: '#444466', fontSize: 11, marginLeft: 8 }}>{timeAgo(comment.created_at)}</span>
                  </div>
                </div>
                {userId === comment.author_id && (
                  <button onClick={() => handleDeleteComment(comment.id)}
                    style={{ background: 'none', border: 'none', color: '#444466', cursor: 'pointer', fontSize: 12, transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ff4466')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#444466')}
                  >✕</button>
                )}
              </div>
              <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{comment.content}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        textarea::placeholder { color: #333355; }

        .post-content h2 { font-size: 20px; font-weight: 800; color: #f0f0f8; margin: 16px 0 8px; line-height: 1.3; }
        .post-content h3 { font-size: 17px; font-weight: 700; color: #f0f0f8; margin: 14px 0 6px; line-height: 1.3; }
        .post-content blockquote { border-left: 3px solid rgba(200,242,60,0.5); padding: 4px 0 4px 14px; margin: 12px 0; color: #8888aa; font-style: italic; }
        .post-content ul { padding-left: 22px; margin: 8px 0; }
        .post-content ol { padding-left: 22px; margin: 8px 0; }
        .post-content li { margin: 3px 0; color: #8888aa; }
        .post-content a { color: #c8f23c; text-decoration: underline; text-underline-offset: 2px; }
        .post-content strong { color: #f0f0f8; font-weight: 700; }
        .post-content em { color: #aaaacc; }
        .post-content s { color: #555577; }
        .post-content p { margin: 8px 0; }

        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}