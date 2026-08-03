'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import toast from 'react-hot-toast'
import Image from 'next/image'

type Post = {
  id: string
  title: string
  content: string
  media_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  profiles: { username: string; avatar_url: string | null } | null
  communities: { name: string; slug: string } | null
}

export default function SavedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('saved_posts')
        .select(`
          post:post_id (
            id, title, content, media_url, likes_count, comments_count, created_at,
            profiles(username, avatar_url),
            communities(name, slug)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setPosts(data?.map((d: any) => d.post).filter(Boolean) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleUnsave(postId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id)
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast('Post removido dos salvos.')
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
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>
        <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, marginBottom: 20 }}>Posts Salvos</h1>

        {loading && [1, 2, 3].map(i => (
          <div key={i} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 12, animation: 'pulse 1.5s ease infinite' }}>
            <div style={{ height: 14, background: '#1a1a28', borderRadius: 6, width: '60%', marginBottom: 10 }} />
            <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '90%', marginBottom: 6 }} />
            <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '40%' }} />
          </div>
        ))}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>🔖</div>
            <p style={{ color: '#444466', fontSize: 15 }}>Nenhum post salvo ainda.</p>
            <p style={{ color: '#333355', fontSize: 13, marginTop: 8 }}>Clique no 🔖 em qualquer post para salvar.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post, i) => (
            <article
              key={post.id}
              style={{
                background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: 20, transition: 'all 0.2s',
                animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => router.push(`/post/${post.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', position: 'relative',
                      background: post.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#000', fontWeight: 800, fontSize: 10,
                    }}>
                      {post.profiles?.avatar_url
                        ? <Image src={post.profiles.avatar_url} alt="" fill sizes="26px" style={{ objectFit: 'cover' }} />
                        : post.profiles?.username?.charAt(0).toUpperCase()
                      }
                    </div>
                    <span style={{ color: '#555577', fontSize: 13 }}>@{post.profiles?.username}</span>
                    {post.communities && (
                      <span style={{ color: '#c8f23c', fontSize: 12 }}>em v/{post.communities.name}</span>
                    )}
                    <span style={{ color: '#333355', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
                  </div>

                  <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{post.title}</h2>
                  {post.content && (
                    <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                      {post.content}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                    <span style={{ color: '#333355', fontSize: 12 }}>▲ {post.likes_count}</span>
                    <span style={{ color: '#333355', fontSize: 12 }}>💬 {post.comments_count}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleUnsave(post.id)}
                  style={{
                    background: 'rgba(200,242,60,0.1)', border: '1px solid rgba(200,242,60,0.2)',
                    color: '#c8f23c', width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
                    fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,50,50,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,50,50,0.3)'; e.currentTarget.style.color = '#ff4466' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,242,60,0.1)'; e.currentTarget.style.borderColor = 'rgba(200,242,60,0.2)'; e.currentTarget.style.color = '#c8f23c' }}
                  title="Remover dos salvos"
                >
                  🔖
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}