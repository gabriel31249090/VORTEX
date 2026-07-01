'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import FeedAd from '../components/FeedAd'
import toast from 'react-hot-toast'

type PlanId = 'free' | 'boost' | 'mega'

type Post = {
  id: string
  title: string
  content: string
  type: string
  media_url: string | null
  likes_count: number
  comments_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null; plan: PlanId; accent_color: string | null } | null
  communities: { name: string; slug: string } | null
}

type FeedTab = 'geral' | 'seguindo'

const PAGE_SIZE = 15
const AD_INTERVAL = 40

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)
}

function SkeletonCard() {
  return (
    <div style={{
      background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: 20, animation: 'pulse 1.5s ease infinite',
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a28', flexShrink: 0 }} />
        <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '25%' }} />
      </div>
      <div style={{ height: 16, background: '#1a1a28', borderRadius: 6, width: '65%', marginBottom: 10 }} />
      <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '90%', marginBottom: 6 }} />
      <div style={{ height: 12, background: '#1a1a28', borderRadius: 6, width: '75%', marginBottom: 16 }} />
      <div style={{ height: 1, background: '#1a1a28', marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ height: 28, background: '#1a1a28', borderRadius: 50, width: 64 }} />
        <div style={{ height: 28, background: '#1a1a28', borderRadius: 50, width: 64 }} />
      </div>
    </div>
  )
}

function getAuthorColor(plan: PlanId, accentColor: string | null): string {
  if (plan === 'mega' && accentColor) return accentColor
  if (plan === 'mega') return '#a78bfa'
  if (plan === 'boost' && accentColor) return accentColor
  if (plan === 'boost') return '#c8f23c'
  return '#c8f23c'
}

function getPlanStyle(plan: PlanId, accentColor: string | null) {
  const color = getAuthorColor(plan, accentColor)

  if (plan === 'mega') return {
    border: `1px solid ${color}44`,
    shadow: `0 0 20px ${color}12`,
    avatarShadow: `0 0 10px ${color}88`,
    hoverBorder: `${color}88`,
    hoverShadow: `0 0 24px ${color}1a`,
    badgeEl: <span style={{ fontSize: 12, lineHeight: 1 }}>👑</span>,
    stripColor: color,
  }
  if (plan === 'boost') return {
    border: `1px solid ${color}40`,
    shadow: `0 0 16px ${color}10`,
    avatarShadow: `0 0 10px ${color}66`,
    hoverBorder: `${color}66`,
    hoverShadow: `0 0 20px ${color}14`,
    badgeEl: <span style={{ fontSize: 12, lineHeight: 1 }}>⚡</span>,
    stripColor: color,
  }
  return {
    border: '1px solid rgba(255,255,255,0.06)',
    shadow: 'none',
    avatarShadow: '0 0 8px rgba(200,242,60,0.2)',
    hoverBorder: 'rgba(200,242,60,0.35)',
    hoverShadow: '0 0 20px rgba(200,242,60,0.08)',
    badgeEl: null,
    stripColor: null,
  }
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [likingPost, setLikingPost] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<PlanId>('free')
  const [tab, setTab] = useState<FeedTab>('geral')
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const [feedAds, setFeedAds] = useState<{ id: string; title: string; description: string | null; image_url: string | null; link_url: string }[]>([])
  const loaderRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('plan').eq('id', user.id).single()
      const plan = (profile?.plan as PlanId) || 'free'
      setUserPlan(plan)

      // Busca anúncios de feed ativos só se o usuário for Free
      if (plan === 'free') {
        const { data: ads } = await supabase
          .from('ads')
          .select('id, title, description, image_url, link_url')
          .eq('type', 'feed')
          .eq('active', true)
        if (ads) setFeedAds(ads)
      }

      const { data: likes } = await supabase
        .from('likes').select('post_id').eq('user_id', user.id)
      if (likes) setLikedPosts(new Set(likes.map((l: any) => l.post_id)))

      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)
      const ids = follows?.map((f: any) => f.following_id) || []
      setFollowingIds(ids)

      await loadPosts(user.id, 'geral', ids, 0)
    }
    init()
  }, [])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: newPost } = await supabase
          .from('posts')
          .select('id, title, content, type, media_url, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url, plan, accent_color), communities(name, slug)')
          .eq('id', payload.new.id)
          .single()
        if (newPost) setPosts(prev => [newPost as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPosts(uid: string, feedTab: FeedTab, followIds: string[], pageNum: number) {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('posts')
      .select('id, title, content, type, media_url, likes_count, comments_count, created_at, author_id, profiles(username, avatar_url, plan, accent_color), communities(name, slug)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (feedTab === 'seguindo' && followIds.length > 0) {
      query = query.in('author_id', followIds)
    } else if (feedTab === 'seguindo' && followIds.length === 0) {
      setPosts([])
      setLoading(false)
      setLoadingMore(false)
      setHasMore(false)
      return
    }

    const { data, error } = await query
    if (error) console.error(error)

    const newPosts = (data as any) || []
    if (pageNum === 0) setPosts(newPosts)
    else setPosts(prev => [...prev, ...newPosts])

    setHasMore(newPosts.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        const nextPage = page + 1
        setPage(nextPage)
        loadPosts(userId!, tab, followingIds, nextPage)
      }
    }, { threshold: 0.1 })

    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, userId, tab, followingIds])

  function switchTab(newTab: FeedTab) {
    setTab(newTab)
    setPage(0)
    setHasMore(true)
    setPosts([])
    if (userId) loadPosts(userId, newTab, followingIds, 0)
  }

  async function handleLike(postId: string) {
    if (!userId || likingPost) return
    setLikingPost(postId)
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
    setTimeout(() => setLikingPost(null), 300)
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/post/${postId}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
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
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: '#111118', borderRadius: 12, padding: 4,
          border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20, gap: 4,
        }}>
          {(['geral', 'seguindo'] as FeedTab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t ? '#c8f23c' : 'transparent',
              color: tab === t ? '#000' : '#555577',
            }}>
              {t === 'geral' ? '🌐 Geral' : '👥 Seguindo'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && tab === 'seguindo' && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>👥</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Você ainda não segue ninguém.</p>
            <p style={{ fontSize: 13, color: '#333355' }}>Siga pessoas para ver os posts delas aqui.</p>
          </div>
        )}

        {!loading && tab === 'geral' && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444466' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌀</div>
            <p style={{ fontSize: 15 }}>Nenhum post ainda. Seja o primeiro!</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map((post, i) => {
            const isLiked = likedPosts.has(post.id)
            const isLiking = likingPost === post.id
            const authorPlan: PlanId = post.profiles?.plan || 'free'
            const authorAccent = post.profiles?.accent_color || null
            const planStyle = getPlanStyle(authorPlan, authorAccent)
            const authorColor = getAuthorColor(authorPlan, authorAccent)
            const isMega = authorPlan === 'mega'

            // Posição real no feed (1-indexed) — insere anúncio a cada 40 posts, só pra Free
            const position = i + 1
            const showAd = userPlan === 'free' && position % AD_INTERVAL === 0 && feedAds.length > 0
            const adToShow = showAd ? feedAds[Math.floor(position / AD_INTERVAL - 1) % feedAds.length] : null

            return (
              <div key={post.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <article
                  style={{
                    background: '#111118',
                    border: planStyle.border,
                    borderRadius: 16, overflow: 'hidden',
                    boxShadow: planStyle.shadow,
                    animation: `fadeUp 0.4s ease ${Math.min(i, 5) * 0.05}s both`,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = planStyle.hoverBorder
                    e.currentTarget.style.boxShadow = planStyle.hoverShadow
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = planStyle.border.replace('1px solid ', '')
                    e.currentTarget.style.boxShadow = planStyle.shadow
                  }}
                >
                  {authorPlan !== 'free' && planStyle.stripColor && (
                    <div style={{
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${planStyle.stripColor}99, transparent)`,
                    }} />
                  )}

                  {post.media_url && (
                    isVideo(post.media_url) ? (
                      <video src={post.media_url} controls onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: 400, display: 'block', background: '#000' }} />
                    ) : (
                      <div onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                        <img src={post.media_url} alt={post.title} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
                      </div>
                    )
                  )}

                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: post.profiles?.avatar_url ? 'none'
                          : `linear-gradient(135deg, ${authorColor}, ${authorColor}99)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#000', fontWeight: 800, fontSize: 13, flexShrink: 0,
                        boxShadow: planStyle.avatarShadow, overflow: 'hidden',
                      }}>
                        {post.profiles?.avatar_url
                          ? <img src={post.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : getInitial(post.profiles?.username || '?')
                        }
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{ color: '#f0f0f8', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                          onClick={e => { e.stopPropagation(); router.push(`/profile/${post.profiles?.username}`) }}
                          onMouseEnter={e => (e.currentTarget.style.color = authorColor)}
                          onMouseLeave={e => (e.currentTarget.style.color = '#f0f0f8')}
                        >
                          @{post.profiles?.username || 'usuário'}
                        </span>
                        {planStyle.badgeEl}
                        {post.communities && (
                          <span
                            style={{ color: '#c8f23c', fontSize: 13, cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); router.push(`/community/${post.communities!.slug}`) }}
                          >
                            em v/{post.communities.name}
                          </span>
                        )}
                        <span style={{ color: '#444466', fontSize: 13 }}>· {timeAgo(post.created_at)}</span>
                      </div>
                    </div>

                    <div onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
                      <h2 style={{
                        color: isMega ? authorColor : '#f0f0f8',
                        fontWeight: 700, fontSize: 17, marginBottom: 8, lineHeight: 1.3,
                        textShadow: isMega ? `0 0 20px ${authorColor}44` : 'none',
                        transition: 'color 0.2s',
                      }}>
                        {post.title}
                      </h2>
                      {post.content && (
                        <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>
                          {post.content}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button
                        onClick={() => handleLike(post.id)}
                        style={{
                          background: isLiked ? `${authorColor}1a` : 'transparent',
                          border: `1px solid ${isLiked ? `${authorColor}66` : 'rgba(255,255,255,0.08)'}`,
                          color: isLiked ? authorColor : '#555577',
                          padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                          fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                          boxShadow: isLiked ? `0 0 10px ${authorColor}33` : 'none',
                          transform: isLiking ? 'scale(1.2)' : 'scale(1)',
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
                        onClick={() => handleShare(post.id)}
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
                  </div>
                </article>

                {/* Anúncio a cada 40 posts — só pra usuários Free */}
                {showAd && adToShow && <FeedAd key={`ad-${position}`} ad={adToShow} />}
              </div>
            )
          })}
        </div>

        {/* Infinite scroll loader */}
        <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          {loadingMore && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#c8f23c',
                  animation: `bounce 0.8s ease ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p style={{ color: '#222240', fontSize: 13 }}>Você chegou ao fim ✦</p>
          )}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}