'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Post = {
  id: string
  title: string
  content: string
  type: string
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
  communities: { name: string; slug: string } | null
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, title, content, type, likes_count, comments_count, created_at, author_id,
          profiles(username, avatar_url),
          communities(name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) console.error(error)
      setPosts((data as any) || [])

      const { data: likes } = await supabase
        .from('likes').select('post_id').eq('user_id', user.id)
      if (likes) setLikedPosts(new Set(likes.map((l: any) => l.post_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleLike(postId: string) {
    if (!userId) return
    const isLiked = likedPosts.has(postId)
    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 }).eq('id', postId)
      setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p))
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId })
      await supabase.from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 }).eq('id', postId)
      setLikedPosts(prev => new Set(prev).add(postId))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p))
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function getInitial(username: string) {
    return username?.charAt(0).toUpperCase() || '?'
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.2)',
        boxShadow: '0 1px 0 rgba(200,242,60,0.1)'
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 22, fontWeight: 800, color: '#c8f23c', letterSpacing: '-0.5px',
            textShadow: '0 0 20px rgba(200,242,60,0.5), 0 0 40px rgba(200,242,60,0.2)'
          }}>
            ◈ VORTEX
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/post/new')}
              style={{
                background: '#c8f23c', color: '#000', fontWeight: 700,
                padding: '8px 18px', borderRadius: 50, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif",
                boxShadow: '0 0 12px rgba(200,242,60,0.4)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.7), 0 0 48px rgba(200,242,60,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(200,242,60,0.4)')}
            >
              + Publicar
            </button>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif' " }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {loading && [1, 2, 3].map(i => (
          <div key={i} style={{
            background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, padding: 20, opacity: 0.5
          }}>
            <div style={{ height: 12, background: '#222230', borderRadius: 6, width: '30%', marginBottom: 12 }} />
            <div style={{ height: 18, background: '#222230', borderRadius: 6, width: '60%', marginBottom: 8 }} />
            <div style={{ height: 12, background: '#222230', borderRadius: 6, width: '90%' }} />
          </div>
        ))}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌀</div>
            <p style={{ fontSize: 15 }}>Nenhum post ainda. Seja o primeiro!</p>
          </div>
        )}

        {posts.map((post, i) => (
          <article
            key={post.id}
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16, padding: 20,
              animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 13, flexShrink: 0,
                boxShadow: '0 0 8px rgba(200,242,60,0.3)'
              }}>
                {getInitial(post.profiles?.username || '?')}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{ color: '#f0f0f8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.profiles?.username}`) }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#c8f23c')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
                >
                  @{post.profiles?.username || 'usuário'}
                </span>
                {post.communities && (
                  <span style={{ color: '#c8f23c', fontSize: 13 }}> em v/{post.communities.name}</span>
                )}
                <span style={{ color: '#444466', fontSize: 13 }}> · {timeAgo(post.created_at)}</span>
              </div>
            </div>

            {/* Conteúdo */}
            <div onClick={() => router.push(`/post/${post.id}`)}>
              <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 17, marginBottom: 8, lineHeight: 1.3 }}>
                {post.title}
              </h2>
              {post.content && (
                <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>
              )}
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => handleLike(post.id)}
                style={{
                  background: likedPosts.has(post.id) ? 'rgba(200,242,60,0.12)' : 'transparent',
                  border: `1px solid ${likedPosts.has(post.id) ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: likedPosts.has(post.id) ? '#c8f23c' : '#555577',
                  padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                  boxShadow: likedPosts.has(post.id) ? '0 0 10px rgba(200,242,60,0.2)' : 'none'
                }}
              >
                ▲ {post.likes_count}
              </button>
              <button
                onClick={() => router.push(`/post/${post.id}`)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#555577', padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555577')}
              >
                💬 {post.comments_count}
              </button>
              <button
                style={{
                  background: 'transparent', border: 'none',
                  color: '#555577', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif",
                  marginLeft: 'auto', transition: 'color 0.2s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555577')}
              >
                ↗ Compartilhar
              </button>
            </div>
          </article>
        ))}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}