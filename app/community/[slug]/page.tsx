'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '../../components/Nav'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  is_private: boolean
  owner_id: string
  created_at: string
}

type Post = {
  id: string
  title: string
  content: string
  media_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null } | null
}

export default function CommunityPage() {
  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [memberCount, setMemberCount] = useState(0)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const slug = params.slug as string

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: communityData } = await supabase
        .from('communities').select('*').eq('slug', slug).single()

      if (!communityData) { setLoading(false); return }
      setCommunity(communityData)

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, media_url, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url)')
        .eq('community_id', communityData.id)
        .order('created_at', { ascending: false })

      setPosts((postsData as any) || [])

      const { data: memberData } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', communityData.id)

      setMemberCount(memberData?.length || 0)
      setIsMember(memberData?.some(m => m.user_id === user.id) || false)

      const { data: likes } = await supabase
        .from('likes').select('post_id').eq('user_id', user.id)
      if (likes) setLikedPosts(new Set(likes.map((l: any) => l.post_id)))

      setLoading(false)
    }
    load()
  }, [slug])

  async function handleJoin() {
    if (!userId || !community) return
    setJoining(true)
    if (isMember) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('user_id', userId)
      setIsMember(false)
      setMemberCount(prev => prev - 1)
    } else {
      await supabase.from('community_members').insert({
        community_id: community.id, user_id: userId, role: 'member'
      })
      setIsMember(true)
      setMemberCount(prev => prev + 1)
    }
    setJoining(false)
  }

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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Carregando...</p>
    </div>
  )

  if (!community) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Comunidade não encontrada.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        {/* Banner da comunidade */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(200,242,60,0.15), rgba(200,242,60,0.05))',
          borderBottom: '1px solid rgba(200,242,60,0.15)',
          padding: '32px 24px 24px',
          marginBottom: 24,
          marginLeft: 'calc(-1 * max(16px, calc(220px + 32px)))',
          paddingLeft: 'max(16px, calc(220px + 32px))',
          width: '100vw',
        }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 28,
                boxShadow: '0 0 20px rgba(200,242,60,0.3)'
              }}>
                {community.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 22 }}>v/{community.name}</h1>
                  {community.is_private && (
                    <span style={{ background: 'rgba(255,255,255,0.08)', color: '#8888aa', fontSize: 11, padding: '2px 8px', borderRadius: 50 }}>privada</span>
                  )}
                </div>
                <p style={{ color: '#555577', fontSize: 13 }}>{memberCount} {memberCount === 1 ? 'membro' : 'membros'}</p>
              </div>
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{
                  background: isMember ? 'transparent' : '#c8f23c',
                  color: isMember ? '#c8f23c' : '#000',
                  border: `1px solid ${isMember ? 'rgba(200,242,60,0.4)' : 'transparent'}`,
                  fontWeight: 700, padding: '8px 20px', borderRadius: 50,
                  cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif",
                  boxShadow: isMember ? 'none' : '0 0 12px rgba(200,242,60,0.3)',
                  transition: 'all 0.2s', opacity: joining ? 0.6 : 1
                }}
              >
                {joining ? '...' : isMember ? 'Sair' : 'Entrar'}
              </button>
            </div>

            {community.description && (
              <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6 }}>{community.description}</p>
            )}
          </div>
        </div>

        {/* Botão publicar na comunidade */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => router.push(`/post/new?community=${community.id}`)}
            style={{
              width: '100%', background: '#111118',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '12px 16px',
              color: '#555577', textAlign: 'left', cursor: 'pointer',
              fontSize: 14, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#8888aa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#555577' }}
          >
            + Publicar em v/{community.name}
          </button>
        </div>

        {/* Posts */}
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p>Nenhum post ainda. Seja o primeiro!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <article
              key={post.id}
              style={{
                background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {post.media_url && (
                <img src={post.media_url} alt={post.title}
                  style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                  onClick={() => router.push(`/post/${post.id}`)}
                />
              )}
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 800, fontSize: 13,
                    boxShadow: '0 0 8px rgba(200,242,60,0.3)'
                  }}>
                    {getInitial(post.profiles?.username || '?')}
                  </div>
                  <span style={{ color: '#8888aa', fontSize: 13 }}>
                    <span style={{ color: '#f0f0f8', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => router.push(`/profile/${post.profiles?.username}`)}>
                      @{post.profiles?.username}
                    </span>
                    {' · '}{timeAgo(post.created_at)}
                  </span>
                </div>

                <div onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                  <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{post.title}</h2>
                  {post.content && (
                    <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={() => handleLike(post.id)}
                    style={{
                      background: likedPosts.has(post.id) ? 'rgba(200,242,60,0.12)' : 'transparent',
                      border: `1px solid ${likedPosts.has(post.id) ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: likedPosts.has(post.id) ? '#c8f23c' : '#555577',
                      padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                      fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                      transition: 'all 0.2s',
                      boxShadow: likedPosts.has(post.id) ? '0 0 10px rgba(200,242,60,0.2)' : 'none'
                    }}
                  >▲ {post.likes_count}</button>
                  <button
                    onClick={() => router.push(`/post/${post.id}`)}
                    style={{
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#555577', padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                      fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f0f0f8')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#555577')}
                  >💬 {post.comments_count}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}