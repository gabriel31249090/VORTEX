'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '../../components/Nav'
import Image from 'next/image'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  is_private: boolean
  owner_id: string
  created_at: string
  banner_url?: string | null
  icon_url?: string | null
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

type Member = {
  user_id: string
  role: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

export default function CommunityPage() {
  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [joining, setJoining] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [memberCount, setMemberCount] = useState(0)
  const [removingPost, setRemovingPost] = useState<string | null>(null)
  const [banningUser, setBanningUser] = useState<string | null>(null)
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
      setIsOwner(user.id === communityData.owner_id)

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, content, media_url, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url)')
        .eq('community_id', communityData.id)
        .order('created_at', { ascending: false })

      setPosts((postsData as any) || [])

      const { data: memberData } = await supabase
        .from('community_members')
        .select('user_id, role, profiles:user_id(username, display_name, avatar_url)')
        .eq('community_id', communityData.id)

      setMembers((memberData as any) || [])
      setMemberCount(memberData?.length || 0)
      setIsMember(memberData?.some((m: any) => m.user_id === user.id) || false)

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
      setMembers(prev => prev.filter(m => m.user_id !== userId))
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

  async function handleRemovePost(postId: string) {
    if (!confirm('Remover este post da comunidade?')) return
    setRemovingPost(postId)
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setRemovingPost(null)
  }

  async function handleBanMember(targetUserId: string, username: string) {
    if (!community) return
    if (!confirm(`Banir @${username} da comunidade?`)) return
    setBanningUser(targetUserId)
    await supabase.from('community_members').delete()
      .eq('community_id', community.id)
      .eq('user_id', targetUserId)
    setMembers(prev => prev.filter(m => m.user_id !== targetUserId))
    setMemberCount(prev => prev - 1)
    setBanningUser(null)
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

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #c8f23c', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#555577', fontSize: 14 }}>Carregando comunidade...</p>
      </div>
    </div>
  )

  if (!community) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif" }}>
      <p style={{ color: '#555577' }}>Comunidade não encontrada.</p>
    </div>
  )

  const ownerMember = members.find(m => m.user_id === community.owner_id)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      {/* ── HERO HEADER ── */}
      <div style={{ marginLeft: 'max(0px, 220px)' }} className="community-header-offset">

        {/* Banner */}
        <div style={{
          height: 180,
          background: community.banner_url
            ? `url(${community.banner_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0d1a00 0%, #101a00 30%, #0a1208 60%, #060d10 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Noise overlay */}
          {!community.banner_url && (
            <>
              {/* Glowing orbs */}
              <div style={{
                position: 'absolute', top: -40, left: '15%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200,242,60,0.12) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }} />
              <div style={{
                position: 'absolute', bottom: -60, right: '20%',
                width: 280, height: 280, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200,242,60,0.07) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }} />
              {/* Grid lines */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(rgba(200,242,60,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(200,242,60,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
            </>
          )}
          {/* Bottom fade */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: 'linear-gradient(to bottom, transparent, #0a0a0f)',
          }} />
        </div>

        {/* Info bar */}
        <div style={{
          background: '#0a0a0f',
          padding: '0 32px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }} className="community-info-bar">

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -36, paddingBottom: 20 }}>

            {/* Community icon */}
            <div style={{
              width: 80, height: 80, borderRadius: 20, flexShrink: 0,
              background: community.icon_url ? `url(${community.icon_url}) center/cover` : 'linear-gradient(135deg, #c8f23c 0%, #8ab82a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 800, fontSize: 34,
              border: '3px solid #0a0a0f',
              boxShadow: '0 0 0 1px rgba(200,242,60,0.3), 0 0 24px rgba(200,242,60,0.2)',
              position: 'relative', zIndex: 1,
            }}>
              {!community.icon_url && community.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + badges */}
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 24, margin: 0, letterSpacing: '-0.5px' }}>
                  v/{community.name}
                </h1>
                {community.is_private && (
                  <span style={{
                    background: 'rgba(255,255,255,0.06)', color: '#8888aa',
                    fontSize: 11, padding: '3px 10px', borderRadius: 50,
                    border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600
                  }}>🔒 privada</span>
                )}
                {isOwner && (
                  <span style={{
                    background: 'rgba(200,242,60,0.12)', color: '#c8f23c',
                    fontSize: 11, padding: '3px 10px', borderRadius: 50,
                    border: '1px solid rgba(200,242,60,0.25)', fontWeight: 700
                  }}>◈ dono</span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#c8f23c', fontWeight: 800, fontSize: 15 }}>{memberCount}</span>
                  <span style={{ color: '#555577', fontSize: 13, marginTop: 1 }}>membros</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: '#c8f23c', fontWeight: 800, fontSize: 15 }}>{posts.length}</span>
                  <span style={{ color: '#555577', fontSize: 13, marginTop: 1 }}>posts</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ color: '#555577', fontSize: 13, marginTop: 1 }}>criada em</span>
                  <span style={{ color: '#8888aa', fontWeight: 600, fontSize: 13, marginTop: 1 }}>{formatDate(community.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Join button */}
            {!isOwner && (
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{
                  background: isMember ? 'transparent' : '#c8f23c',
                  color: isMember ? '#c8f23c' : '#000',
                  border: `1.5px solid ${isMember ? 'rgba(200,242,60,0.35)' : 'transparent'}`,
                  fontWeight: 700, padding: '10px 24px', borderRadius: 50,
                  cursor: 'pointer', fontSize: 14, fontFamily: "'Syne', sans-serif",
                  boxShadow: isMember ? 'none' : '0 0 16px rgba(200,242,60,0.35)',
                  transition: 'all 0.2s', opacity: joining ? 0.6 : 1,
                  whiteSpace: 'nowrap', flexShrink: 0, marginBottom: 4,
                }}
                onMouseEnter={e => {
                  if (!isMember) e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.5)'
                  else { e.currentTarget.style.background = 'rgba(255,60,60,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,60,60,0.3)'; e.currentTarget.style.color = '#ff6060' }
                }}
                onMouseLeave={e => {
                  if (!isMember) e.currentTarget.style.boxShadow = '0 0 16px rgba(200,242,60,0.35)'
                  else { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(200,242,60,0.35)'; e.currentTarget.style.color = '#c8f23c' }
                }}
              >
                {joining ? '...' : isMember ? 'Sair da comunidade' : '+ Entrar'}
              </button>
            )}
          </div>

          {/* Description */}
          {community.description && (
            <p style={{
              color: '#8888aa', fontSize: 14, lineHeight: 1.7,
              paddingBottom: 20, maxWidth: 680, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 16,
            }}>
              {community.description}
            </p>
          )}
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <main style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '24px 24px 80px',
        paddingLeft: 'max(24px, calc(220px + 24px))',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 24,
        alignItems: 'start',
      }} className="community-main">

        {/* ── LEFT: Feed ── */}
        <div>
          {/* Botão publicar */}
          <button
            onClick={() => router.push(`/post/new?community=${community.id}`)}
            style={{
              width: '100%', background: '#111118',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '13px 18px',
              color: '#555577', textAlign: 'left', cursor: 'pointer',
              fontSize: 14, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s',
              marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'
              e.currentTarget.style.color = '#8888aa'
              e.currentTarget.style.background = '#13131c'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.color = '#555577'
              e.currentTarget.style.background = '#111118'
            }}
          >
            <span style={{ fontSize: 20, opacity: 0.4 }}>✏</span>
            <span>Publicar em v/{community.name}...</span>
          </button>

          {/* Posts */}
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#444466' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 14 }}>Nenhum post ainda. Seja o primeiro!</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {posts.map(post => (
              <article
                key={post.id}
                style={{
                  background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(200,242,60,0.2)'
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(200,242,60,0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {post.media_url && (
                  <img src={post.media_url} alt={post.title}
                    style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                    onClick={() => router.push(`/post/${post.id}`)}
                  />
                )}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        onClick={() => router.push(`/profile/${post.profiles?.username}`)}
                        style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0, position: 'relative',
                          background: post.profiles?.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer', overflow: 'hidden',
                        }}
                      >
                        {post.profiles?.avatar_url
                          ? <Image src={post.profiles.avatar_url} alt="" fill sizes="30px" style={{ objectFit: 'cover' }} />
                          : getInitial(post.profiles?.username || '?')
                        }
                      </div>
                      <span style={{ color: '#8888aa', fontSize: 13 }}>
                        <span
                          style={{ color: '#f0f0f8', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => router.push(`/profile/${post.profiles?.username}`)}
                        >@{post.profiles?.username}</span>
                        {' · '}{timeAgo(post.created_at)}
                      </span>
                    </div>

                    {isOwner && post.author_id !== userId && (
                      <button
                        onClick={() => handleRemovePost(post.id)}
                        disabled={removingPost === post.id}
                        style={{
                          background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.18)',
                          color: '#ff6060', padding: '4px 12px', borderRadius: 50, cursor: 'pointer',
                          fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                          transition: 'all 0.2s', opacity: removingPost === post.id ? 0.5 : 1
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,60,60,0.14)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,60,60,0.07)'}
                      >
                        {removingPost === post.id ? '...' : '✕ Remover'}
                      </button>
                    )}
                  </div>

                  <div onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                    <h2 style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 16, marginBottom: 6, lineHeight: 1.4 }}>{post.title}</h2>
                    {post.content && (
                      <p style={{
                        color: '#8888aa', fontSize: 14, lineHeight: 1.65,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {post.content}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={() => handleLike(post.id)}
                      style={{
                        background: likedPosts.has(post.id) ? 'rgba(200,242,60,0.1)' : 'transparent',
                        border: `1px solid ${likedPosts.has(post.id) ? 'rgba(200,242,60,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        color: likedPosts.has(post.id) ? '#c8f23c' : '#555577',
                        padding: '5px 14px', borderRadius: 50, cursor: 'pointer',
                        fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: likedPosts.has(post.id) ? '0 0 8px rgba(200,242,60,0.15)' : 'none'
                      }}
                    >▲ {post.likes_count}</button>
                    <button
                      onClick={() => router.push(`/post/${post.id}`)}
                      style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                        color: '#555577', padding: '5px 14px', borderRadius: 50, cursor: 'pointer',
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
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="community-sidebar">

          {/* Sobre */}
          <div style={{
            background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: '#c8f23c', fontSize: 13 }}>◈</span>
              <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>Sobre a comunidade</span>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {community.description && (
                <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  {community.description}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#555577', fontSize: 12 }}>Membros</span>
                  <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>{memberCount}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#555577', fontSize: 12 }}>Posts</span>
                  <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>{posts.length}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#555577', fontSize: 12 }}>Tipo</span>
                  <span style={{ color: community.is_private ? '#a78bfa' : '#c8f23c', fontWeight: 600, fontSize: 12 }}>
                    {community.is_private ? '🔒 Privada' : '◎ Pública'}
                  </span>
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#555577', fontSize: 12 }}>Criada em</span>
                  <span style={{ color: '#8888aa', fontSize: 12 }}>{formatDate(community.created_at)}</span>
                </div>
              </div>

              {!isOwner && (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  style={{
                    width: '100%',
                    background: isMember ? 'transparent' : '#c8f23c',
                    color: isMember ? '#c8f23c' : '#000',
                    border: `1.5px solid ${isMember ? 'rgba(200,242,60,0.35)' : 'transparent'}`,
                    fontWeight: 700, padding: '10px 0', borderRadius: 50,
                    cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif",
                    boxShadow: isMember ? 'none' : '0 0 14px rgba(200,242,60,0.25)',
                    transition: 'all 0.2s', opacity: joining ? 0.6 : 1,
                    marginTop: 4,
                  }}
                >
                  {joining ? '...' : isMember ? 'Sair da comunidade' : '+ Entrar na comunidade'}
                </button>
              )}
            </div>
          </div>

          {/* Membros */}
          <div style={{
            background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#c8f23c', fontSize: 13 }}>◎</span>
                <span style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14 }}>Membros</span>
              </div>
              <span style={{
                background: 'rgba(200,242,60,0.1)', color: '#c8f23c',
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 50
              }}>{memberCount}</span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {members.length === 0 && (
                <p style={{ color: '#444466', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhum membro ainda.</p>
              )}

              {members.slice(0, 8).map(member => {
                const profile = member.profiles as any
                if (!profile) return null
                const isOwnerMember = member.user_id === community.owner_id

                return (
                  <div
                    key={member.user_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 18px', cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onClick={() => router.push(`/profile/${profile.username}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', position: 'relative',
                      background: profile.avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#000', fontWeight: 800, fontSize: 13,
                      boxShadow: isOwnerMember ? '0 0 0 2px #c8f23c' : 'none',
                    }}>
                      {profile.avatar_url
                        ? <Image src={profile.avatar_url} alt="" fill sizes="34px" style={{ objectFit: 'cover' }} />
                        : getInitial(profile.username)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: '#f0f0f8', fontWeight: 600, fontSize: 13,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0
                      }}>
                        {profile.display_name || profile.username}
                      </p>
                      <p style={{ color: '#555577', fontSize: 11, margin: 0 }}>@{profile.username}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isOwnerMember && (
                        <span style={{
                          background: 'rgba(200,242,60,0.12)', color: '#c8f23c',
                          fontSize: 9, padding: '2px 7px', borderRadius: 50, fontWeight: 700
                        }}>dono</span>
                      )}
                      {isOwner && !isOwnerMember && member.user_id !== userId && (
                        <button
                          onClick={e => { e.stopPropagation(); handleBanMember(member.user_id, profile.username) }}
                          disabled={banningUser === member.user_id}
                          style={{
                            background: 'rgba(255,60,60,0.07)', border: '1px solid rgba(255,60,60,0.18)',
                            color: '#ff6060', padding: '3px 10px', borderRadius: 50, cursor: 'pointer',
                            fontSize: 11, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                            transition: 'all 0.2s', opacity: banningUser === member.user_id ? 0.5 : 1
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,60,60,0.14)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,60,60,0.07)')}
                        >
                          {banningUser === member.user_id ? '...' : 'Banir'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {members.length > 8 && (
                <div style={{ padding: '8px 18px 12px' }}>
                  <p style={{ color: '#555577', fontSize: 12, textAlign: 'center', margin: 0 }}>
                    + {members.length - 8} outros membros
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dono */}
          {ownerMember?.profiles && (
            <div style={{
              background: '#111118', border: '1px solid rgba(200,242,60,0.1)',
              borderRadius: 16, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
              onClick={() => router.push(`/profile/${(ownerMember.profiles as any).username}`)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(200,242,60,0.1)')}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                background: (ownerMember.profiles as any).avatar_url ? 'none' : 'linear-gradient(135deg, #c8f23c, #8ab82a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontWeight: 800, fontSize: 16, flexShrink: 0,
                boxShadow: '0 0 0 2px #c8f23c, 0 0 10px rgba(200,242,60,0.2)',
              }}>
                {(ownerMember.profiles as any).avatar_url
                  ? <Image src={(ownerMember.profiles as any).avatar_url} alt="" fill sizes="40px" style={{ objectFit: 'cover' }} />
                  : getInitial((ownerMember.profiles as any).username)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#555577', fontSize: 11, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moderador</p>
                <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, margin: 0 }}>
                  {(ownerMember.profiles as any).display_name || (ownerMember.profiles as any).username}
                </p>
              </div>
              <span style={{ color: '#c8f23c', fontSize: 16 }}>→</span>
            </div>
          )}
        </aside>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 767px) {
          .community-header-offset { margin-left: 0 !important; }
          .community-info-bar { padding: 0 16px 0 !important; }
          .community-main {
            grid-template-columns: 1fr !important;
            padding-left: 16px !important;
          }
          .community-sidebar { display: none !important; }
        }

        @media (min-width: 768px) and (max-width: 1100px) {
          .community-main {
            grid-template-columns: 1fr 260px !important;
          }
        }
      `}</style>
    </div>
  )
}