'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Community = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  banner_url: string | null
  members_count: number
  posts_count: number
  created_at: string
  creator_id: string
}

type Post = {
  id: string
  title: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
  author: { username: string; display_name: string | null; avatar_url: string | null }
}

type SortOption = 'hot' | 'new' | 'top'

export default function CommunityPage() {
  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [sort, setSort] = useState<SortOption>('hot')

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const slug = params.slug as string

  useEffect(() => {
    load()
  }, [slug, sort])

  async function load() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)

    const { data: comm } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!comm) { setLoading(false); return }
    setCommunity(comm)

    // Check membership
    if (user) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', comm.id)
        .eq('user_id', user.id)
        .single()
      setIsMember(!!membership)
    }

    // Load posts
    let query = supabase
      .from('posts')
      .select('id, title, content, likes_count, comments_count, created_at, author:author_id(username, display_name, avatar_url)')
      .eq('community_id', comm.id)

    if (sort === 'new') query = query.order('created_at', { ascending: false })
    else if (sort === 'top') query = query.order('likes_count', { ascending: false })
    else query = query.order('likes_count', { ascending: false }) // hot: simple for now

    const { data: postsData } = await query.limit(30)
    setPosts((postsData as any) || [])
    setLoading(false)
  }

  async function handleJoinToggle() {
    if (!currentUserId || !community) { router.push('/login'); return }
    setJoining(true)

    if (isMember) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('user_id', currentUserId)
      await supabase.from('communities').update({ members_count: Math.max(0, community.members_count - 1) }).eq('id', community.id)
      setCommunity(prev => prev ? { ...prev, members_count: prev.members_count - 1 } : prev)
      setIsMember(false)
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: currentUserId })
      await supabase.from('communities').update({ members_count: community.members_count + 1 }).eq('id', community.id)
      setCommunity(prev => prev ? { ...prev, members_count: prev.members_count + 1 } : prev)
      setIsMember(true)
    }

    setJoining(false)
  }

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  if (loading && !community) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#333355' }}>Carregando...</p>
    </div>
  )

  if (!community && !loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Comunidade não encontrada.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(200,242,60,0.15)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px', height: 58, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => router.push('/feed')}
              style={{ background: 'none', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 16, fontFamily: "'Syne', sans-serif" }}
            >
              ←
            </button>
            <span style={{ fontSize: 18 }}>{community?.icon || '🌐'}</span>
            <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15 }}>r/{community?.slug}</span>
          </div>

          {/* Join button in header */}
          <button
            onClick={handleJoinToggle}
            disabled={joining}
            style={{
              background: isMember ? 'transparent' : '#c8f23c',
              border: isMember ? '1px solid rgba(255,255,255,0.12)' : 'none',
              color: isMember ? '#8888aa' : '#000',
              padding: '6px 16px', borderRadius: 999, cursor: joining ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              transition: 'all 0.2s',
              opacity: joining ? 0.6 : 1,
              boxShadow: isMember ? 'none' : '0 0 12px rgba(200,242,60,0.25)',
            }}
          >
            {joining ? '...' : isMember ? 'Membro ✓' : 'Entrar'}
          </button>
        </div>
      </header>

      {/* Banner */}
      <div style={{
        height: 140, position: 'relative', overflow: 'hidden',
        background: community?.banner_url ? 'none' : 'linear-gradient(135deg, rgba(200,242,60,0.12) 0%, rgba(200,242,60,0.03) 50%, rgba(10,10,15,0) 100%)',
        borderBottom: '1px solid rgba(200,242,60,0.08)',
      }}>
        {community?.banner_url && (
          <img src={community.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0a0a0f)' }} />
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
        {/* Community Info Card */}
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '20px 24px', marginTop: -40, position: 'relative', zIndex: 10,
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Icon */}
            <div style={{
              width: 60, height: 60, borderRadius: 16, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(200,242,60,0.2), rgba(200,242,60,0.05))',
              border: '2px solid rgba(200,242,60,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {community?.icon || '🌐'}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
                {community?.name}
              </h1>
              <p style={{ color: '#555577', fontSize: 13, marginBottom: 10 }}>r/{community?.slug}</p>

              {community?.description && (
                <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                  {community.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>
                    {community?.members_count?.toLocaleString('pt-BR') || 0}
                  </p>
                  <p style={{ color: '#333355', fontSize: 11 }}>membros</p>
                </div>
                <div>
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>
                    {community?.posts_count?.toLocaleString('pt-BR') || posts.length}
                  </p>
                  <p style={{ color: '#333355', fontSize: 11 }}>posts</p>
                </div>
                <div>
                  <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16 }}>
                    {new Date(community?.created_at || '').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
                  <p style={{ color: '#333355', fontSize: 11 }}>criada em</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sort + New Post */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#111118', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
            {(['hot', 'new', 'top'] as SortOption[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  background: sort === s ? 'rgba(200,242,60,0.15)' : 'transparent',
                  color: sort === s ? '#c8f23c' : '#555577',
                }}
              >
                {s === 'hot' ? '🔥 Hot' : s === 'new' ? '✦ Novo' : '▲ Top'}
              </button>
            ))}
          </div>
          {isMember && (
            <button
              onClick={() => router.push(`/post/new?community=${community?.id}`)}
              style={{
                background: '#c8f23c', color: '#000', fontWeight: 700,
                padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif",
                boxShadow: '0 0 14px rgba(200,242,60,0.3)', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              + Postar
            </button>
          )}
        </div>

        {/* Posts */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#333355', fontSize: 14 }}>Carregando posts...</div>
        )}

        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40, opacity: 0.2 }}>📝</div>
            <p style={{ color: '#333355', fontSize: 14 }}>Nenhum post ainda.</p>
            {isMember && (
              <button
                onClick={() => router.push(`/post/new?community=${community?.id}`)}
                style={{
                  background: '#c8f23c', color: '#000', fontWeight: 700,
                  padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontFamily: "'Syne', sans-serif",
                }}
              >
                Seja o primeiro a postar
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 40 }}>
          {posts.map((post, i) => {
            const author = post.author as any
            return (
              <article
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                style={{
                  background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                  transition: 'all 0.2s',
                  animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {/* Author row */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    background: author?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: '#000',
                  }}>
                    {author?.avatar_url
                      ? <img src={author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : author?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#555577', fontSize: 13 }}>@{author?.username}</span>
                  <span style={{ color: '#222240', fontSize: 12 }}>·</span>
                  <span style={{ color: '#222240', fontSize: 12 }}>{timeAgo(post.created_at)}</span>
                </div>

                <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{post.title}</h2>

                {post.content && (
                  <p style={{
                    color: '#8888aa', fontSize: 13, lineHeight: 1.6, marginBottom: 12,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                  } as any}>
                    {post.content}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ color: '#333355', fontSize: 12 }}>▲ {post.likes_count}</span>
                  <span style={{ color: '#333355', fontSize: 12 }}>💬 {post.comments_count}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}