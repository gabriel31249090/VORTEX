'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import RippleButton from '../components/RippleButton'
import PostCard from '../components/PostCard'
import StoriesBar from '../components/StoriesBar'
import type { ReportReason } from '../components/ReportModal'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const BlackHoleBackground = dynamic(() => import('../components/BlackHoleBackground'), { ssr: false })

type PlanId = 'free' | 'boost' | 'mega'
type VoteType = 'up' | 'down'

type Post = {
  id: string
  title: string
  content: string
  type: string
  media_url: string | null
  likes_count: number
  comments_count: number
  reposts_count: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null; plan: PlanId; accent_color: string | null } | null
  communities: { name: string; slug: string } | null
}

type FeedItem = Post & {
  activityId: string
  isRepost: boolean
  repostedByUsername: string | null
}

type FeedTab = 'geral' | 'seguindo'

const PAGE_SIZE = 15
const AD_INTERVAL = 40

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

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [votes, setVotes] = useState<Map<string, VoteType>>(new Map())
  const [votingPost, setVotingPost] = useState<string | null>(null)
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<PlanId>('free')
  const [isAdmin, setIsAdmin] = useState(false)
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
        .from('profiles').select('plan, is_admin').eq('id', user.id).single()
      const plan = (profile?.plan as PlanId) || 'free'
      setUserPlan(plan)
      setIsAdmin(!!profile?.is_admin)

      if (plan === 'free') {
        const { data: ads } = await supabase
          .from('ads')
          .select('id, title, description, image_url, link_url')
          .eq('type', 'feed')
          .eq('active', true)
        if (ads) setFeedAds(ads)
      }

      const { data: likes } = await supabase
        .from('likes').select('post_id, vote_type').eq('user_id', user.id)
      if (likes) {
        setVotes(new Map(likes.map((l: any) => [l.post_id, (l.vote_type as VoteType) || 'up'])))
      }

      const { data: myReposts } = await supabase
        .from('reposts').select('post_id').eq('user_id', user.id)
      if (myReposts) setRepostedIds(new Set(myReposts.map((r: any) => r.post_id)))

      const { data: follows } = await supabase
        .from('follows').select('following_id').eq('follower_id', user.id)
      const ids = follows?.map((f: any) => f.following_id) || []
      setFollowingIds(ids)

      await loadPosts(user.id, 'geral', ids, 0)
    }
    init()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: newPost } = await supabase
          .from('posts')
          .select('id, title, content, type, media_url, likes_count, comments_count, reposts_count, created_at, author_id, profiles(username, avatar_url, plan, accent_color), communities(name, slug)')
          .eq('id', payload.new.id)
          .single()
        if (newPost) {
          setPosts(prev => [{
            ...(newPost as any),
            activityId: (newPost as any).id,
            isRepost: false,
            repostedByUsername: null,
          }, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPosts(uid: string, feedTab: FeedTab, followIds: string[], pageNum: number) {
    if (pageNum === 0) setLoading(true)
    else setLoadingMore(true)

    if (feedTab === 'seguindo' && followIds.length === 0) {
      setPosts([])
      setLoading(false)
      setLoadingMore(false)
      setHasMore(false)
      return
    }

    let activityQuery = supabase
      .from('feed_activity')
      .select('post_id, author_id, activity_at, is_repost, reposter_id, reposter_username')
      .order('activity_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

    if (feedTab === 'seguindo') {
      const idList = followIds.join(',')
      activityQuery = activityQuery.or(`author_id.in.(${idList}),reposter_id.in.(${idList})`)
    }

    const { data: activity, error: activityError } = await activityQuery
    if (activityError) console.error(activityError)

    const rows = activity || []
    if (rows.length === 0) {
      if (pageNum === 0) setPosts([])
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const postIds = [...new Set(rows.map((r: any) => r.post_id))]
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content, type, media_url, likes_count, comments_count, reposts_count, created_at, author_id, profiles(username, avatar_url, plan, accent_color), communities(name, slug)')
      .in('id', postIds)
    if (postsError) console.error(postsError)

    const postMap = new Map((postsData || []).map((p: any) => [p.id, p]))

    const newItems: FeedItem[] = rows
      .map((r: any) => {
        const base = postMap.get(r.post_id)
        if (!base) return null
        return {
          ...base,
          activityId: r.is_repost ? `${r.post_id}-r-${r.reposter_id}` : r.post_id,
          isRepost: r.is_repost,
          repostedByUsername: r.is_repost ? r.reposter_username : null,
        }
      })
      .filter(Boolean)

    if (pageNum === 0) setPosts(newItems)
    else setPosts(prev => [...prev, ...newItems])

    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }

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

  async function handleVote(postId: string, type: VoteType) {
    if (!userId || votingPost) return
    setVotingPost(postId)

    const current = votes.get(postId) ?? null
    let delta = 0
    let nextVote: VoteType | null = type

    if (current === null) {
      delta = type === 'up' ? 1 : -1
    } else if (current === type) {
      delta = type === 'up' ? -1 : 1
      nextVote = null
    } else {
      delta = type === 'up' ? 2 : -2
    }

    const post = posts.find(p => p.id === postId)
    if (!post) { setVotingPost(null); return }

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + delta } : p))
    setVotes(prev => {
      const next = new Map(prev)
      if (nextVote === null) next.delete(postId)
      else next.set(postId, nextVote)
      return next
    })

    if (nextVote === null) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
    } else if (current === null) {
      await supabase.from('likes').insert({ post_id: postId, user_id: userId, vote_type: nextVote })
    } else {
      await supabase.from('likes').update({ vote_type: nextVote }).eq('post_id', postId).eq('user_id', userId)
    }
    await supabase.from('posts').update({ likes_count: post.likes_count + delta }).eq('id', postId)

    setTimeout(() => setVotingPost(null), 300)
  }

  async function handleRepost(postId: string) {
    if (!userId) return
    const isReposted = repostedIds.has(postId)
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const delta = isReposted ? -1 : 1

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reposts_count: (p.reposts_count ?? 0) + delta } : p))
    setRepostedIds(prev => {
      const next = new Set(prev)
      if (isReposted) next.delete(postId)
      else next.add(postId)
      return next
    })

    if (isReposted) {
      await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', userId)
    } else {
      await supabase.from('reposts').insert({ post_id: postId, user_id: userId })
    }
    await supabase.from('posts').update({ reposts_count: (post.reposts_count ?? 0) + delta }).eq('id', postId)

    toast.success(isReposted ? 'Republicação desfeita' : 'Republicado!')
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/post/${postId}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  async function handleReportPost(postId: string, reason: ReportReason, details: string) {
    if (!userId) return
    const { error } = await supabase.from('post_reports').insert({
      post_id: postId,
      reporter_id: userId,
      reason,
      details: details || null,
    })
    if (error) {
      if (error.code === '23505') toast.error('Você já denunciou este post.')
      else toast.error('Erro ao enviar denúncia.')
      return
    }
    toast.success('Denúncia enviada. Obrigado por ajudar a manter o VORTEX seguro.')
  }

  async function handleAdminDelete(postId: string) {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      toast.error('Erro ao excluir post.')
      return
    }
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post excluído.')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif", position: 'relative', overflow: 'hidden' }}>
      <BlackHoleBackground intensity={0.35} particleCount={2200} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Nav />

        <main style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px', paddingLeft: 'max(16px, calc(220px + 32px))' }}>

          {userId && <StoriesBar currentUserId={userId} />}

          {/* Tabs */}
          <div style={{
            display: 'flex', background: '#111118', borderRadius: 12, padding: 4,
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: 20, gap: 4,
          }}>
            {(['geral', 'seguindo'] as FeedTab[]).map(t => (
              <RippleButton
                key={t}
                onClick={() => switchTab(t)}
                className={tab === t ? 'vtx-btn-glow' : 'vtx-btn'}
                rippleColor={tab === t ? 'rgba(0,0,0,0.25)' : 'rgba(200,242,60,0.25)'}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  background: tab === t ? '#c8f23c' : 'transparent',
                  color: tab === t ? '#000' : '#555577',
                }}>
                {t === 'geral' ? '🌐 Geral' : '👥 Seguindo'}
              </RippleButton>
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
            {posts.map((item, i) => {
              const position = i + 1
              const showAd = userPlan === 'free' && position % AD_INTERVAL === 0 && feedAds.length > 0
              const adToShow = showAd ? feedAds[Math.floor(position / AD_INTERVAL - 1) % feedAds.length] : null

              return (
                <PostCard
                  key={item.activityId}
                  post={item}
                  index={i}
                  voteType={votes.get(item.id) ?? null}
                  onVote={handleVote}
                  onShare={handleShare}
                  onRepost={handleRepost}
                  isReposted={repostedIds.has(item.id)}
                  isRepostFeedItem={item.isRepost}
                  repostedByUsername={item.repostedByUsername}
                  showAd={showAd}
                  adToShow={adToShow}
                  adPosition={position}
                  isAdmin={isAdmin}
                  onReport={handleReportPost}
                  onAdminDelete={handleAdminDelete}
                />
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
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,700&display=swap');
        @keyframes megaShine { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media (max-width: 767px) { main { padding-left: 16px !important; } }
      `}</style>
    </div>
  )
}
