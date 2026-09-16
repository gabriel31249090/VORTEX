'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '../components/Nav'
import PostCard, { type FeedViewMode } from '../components/PostCard'
import StoriesBar from '../components/StoriesBar'
import FeedComposer from '../components/FeedComposer'
import FeedRightRail from '../components/FeedRightRail'
import FeedDiscoveryEnd from '../components/FeedDiscoveryEnd'
import FeedSortMenu, { type FeedSort } from '../components/FeedSortMenu'
import type { ReportReason } from '../components/ReportModal'
import toast from 'react-hot-toast'
import BackgroundGradient from '../components/BackgroundGradient'
import { Globe2, LayoutList, RefreshCw, Rows3, Search, Users2 } from 'lucide-react'

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
  profiles: {
    username: string
    avatar_url: string | null
    plan: PlanId
    accent_color: string | null
  } | null
  communities: { name: string; slug: string } | null
}
type FeedItem = Post & {
  activityId: string
  isRepost: boolean
  repostedByUsername: string | null
  activityAt: string
}

type FeedRow = {
  activity_at: string
  post_id: string
  author_id: string
  title: string
  content: string | null
  type: string
  media_url: string | null
  likes_count: number
  comments_count: number
  reposts_count: number
  created_at: string
  profile_username: string | null
  profile_avatar_url: string | null
  profile_plan: PlanId | null
  profile_accent_color: string | null
  community_name: string | null
  community_slug: string | null
  is_repost: boolean
  reposter_id: string | null
  reposter_username: string | null
  viewer_vote: VoteType | null
  viewer_reposted: boolean
  rank_score: number
}
type FeedTab = 'geral' | 'seguindo'

const PAGE_SIZE = 15
const AD_INTERVAL = 40

function SkeletonCard() {
  return (
    <div className="vtx-reddit-post vtx-feed-skeleton" aria-hidden="true">
      <aside className="vtx-vote-rail">
        <span className="vtx-skeleton-block vtx-skeleton-vote" />
        <span className="vtx-skeleton-block vtx-skeleton-score" />
        <span className="vtx-skeleton-block vtx-skeleton-vote" />
      </aside>
      <div className="vtx-post-main">
        <div className="vtx-skeleton-meta">
          <span className="vtx-skeleton-block vtx-skeleton-avatar" />
          <span className="vtx-skeleton-block" style={{ width: 160, height: 10 }} />
        </div>
        <span className="vtx-skeleton-block" style={{ width: '82%', height: 16, marginTop: 12 }} />
        <span className="vtx-skeleton-block" style={{ width: '58%', height: 12, marginTop: 9 }} />
        <span className="vtx-skeleton-block" style={{ width: '36%', height: 12, marginTop: 7 }} />
        <div className="vtx-skeleton-actions">
          <span className="vtx-skeleton-block" />
          <span className="vtx-skeleton-block" />
          <span className="vtx-skeleton-block" />
        </div>
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
  const [sortMode, setSortMode] = useState<FeedSort>('recent')
  const [viewMode, setViewMode] = useState<FeedViewMode>('card')
  const [profileSummary, setProfileSummary] = useState<{ username: string | null; avatar_url: string | null }>({ username: null, avatar_url: null })
  const [cursorScore, setCursorScore] = useState<number | null>(null)
  const [cursorAt, setCursorAt] = useState<string | null>(null)
  const [cursorPostId, setCursorPostId] = useState<string | null>(null)
  const [feedAds, setFeedAds] = useState<
    { id: string; title: string; description: string | null; image_url: string | null; link_url: string }[]
  >([])
  const loaderRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, is_admin, username, avatar_url')
        .eq('id', user.id)
        .single()
      const plan = (profile?.plan as PlanId) || 'free'
      setUserPlan(plan)
      setIsAdmin(!!profile?.is_admin)
      setProfileSummary({ username: profile?.username || null, avatar_url: profile?.avatar_url || null })

      if (plan === 'free') {
        const { data: ads } = await supabase
          .from('ads')
          .select('id, title, description, image_url, link_url')
          .eq('type', 'feed')
          .eq('active', true)
        if (ads) setFeedAds(ads)
      }

      const savedSort = window.localStorage.getItem('vortex-feed-sort')
      const initialSort: FeedSort = savedSort === 'hot' || savedSort === 'top' || savedSort === 'recent'
        ? savedSort
        : 'recent'
      setSortMode(initialSort)
      await loadPosts('geral', initialSort, null, true)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('vortex-feed-view')
    if (saved === 'card' || saved === 'compact') setViewMode(saved)
  }, [])

  function changeView(next: FeedViewMode) {
    setViewMode(next)
    window.localStorage.setItem('vortex-feed-view', next)
  }

  type FeedCursor = {
    score: number | null
    at: string | null
    postId: string | null
  }

  async function loadPosts(
    feedTab: FeedTab,
    sort: FeedSort,
    cursor: FeedCursor | null,
    replace = false
  ) {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    const { data, error } = await supabase.rpc('feed_page_v2', {
      feed_mode: feedTab,
      sort_mode: sort,
      cursor_score: cursor?.score ?? null,
      cursor_at: cursor?.at ?? null,
      cursor_post_id: cursor?.postId ?? null,
      limit_count: PAGE_SIZE,
    })

    if (error) {
      console.error(error)
      if (replace) setPosts([])
      setHasMore(false)
      setLoading(false)
      setLoadingMore(false)
      return
    }

    const rows = (Array.isArray(data) ? data : []) as FeedRow[]
    const newItems: FeedItem[] = rows.map((row) => ({
      id: row.post_id,
      title: row.title,
      content: row.content || '',
      type: row.type,
      media_url: row.media_url,
      likes_count: row.likes_count,
      comments_count: row.comments_count,
      reposts_count: row.reposts_count,
      created_at: row.created_at,
      author_id: row.author_id,
      profiles: row.profile_username ? {
        username: row.profile_username,
        avatar_url: row.profile_avatar_url,
        plan: row.profile_plan || 'free',
        accent_color: row.profile_accent_color,
      } : null,
      communities: row.community_name && row.community_slug ? {
        name: row.community_name,
        slug: row.community_slug,
      } : null,
      activityId: row.is_repost
        ? `${row.post_id}-r-${row.reposter_id || 'unknown'}-${row.activity_at}`
        : `${row.post_id}-${row.activity_at}`,
      isRepost: row.is_repost,
      repostedByUsername: row.reposter_username,
      activityAt: row.activity_at,
    }))

    setVotes((prev) => {
      const next = replace ? new Map<string, VoteType>() : new Map(prev)
      rows.forEach((row) => {
        if (row.viewer_vote) next.set(row.post_id, row.viewer_vote)
        else if (replace) next.delete(row.post_id)
      })
      return next
    })

    setRepostedIds((prev) => {
      const next = replace ? new Set<string>() : new Set(prev)
      rows.forEach((row) => {
        if (row.viewer_reposted) next.add(row.post_id)
        else if (replace) next.delete(row.post_id)
      })
      return next
    })

    if (replace) setPosts(newItems)
    else setPosts((prev) => [...prev, ...newItems])

    const last = rows.length ? rows[rows.length - 1] : null
    setCursorScore(last?.rank_score ?? null)
    setCursorAt(last?.activity_at ?? null)
    setCursorPostId(last?.post_id ?? null)
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        hasMore &&
        !loadingMore &&
        !loading &&
        userId
      ) {
        loadPosts(tab, sortMode, {
          score: cursorScore,
          at: cursorAt,
          postId: cursorPostId,
        }, false)
      }
    }, { threshold: 0.1 })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, cursorScore, cursorAt, cursorPostId, userId, tab, sortMode])

  function resetCursor() {
    setCursorScore(null)
    setCursorAt(null)
    setCursorPostId(null)
  }

  function switchTab(newTab: FeedTab) {
    if (newTab === tab) return
    setTab(newTab)
    resetCursor()
    setHasMore(true)
    setPosts([])
    if (userId) loadPosts(newTab, sortMode, null, true)
  }

  function changeSort(next: FeedSort) {
    if (next === sortMode) return
    setSortMode(next)
    window.localStorage.setItem('vortex-feed-sort', next)
    resetCursor()
    setHasMore(true)
    setPosts([])
    if (userId) loadPosts(tab, next, null, true)
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
    const post = posts.find((p) => p.id === postId)
    if (!post) {
      setVotingPost(null)
      return
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes_count: p.likes_count + delta } : p
      )
    )
    setVotes((prev) => {
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
    if (type === 'up' && nextVote === 'up' && post.author_id !== userId) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: post.author_id,
          title: 'Nova curtida',
          body: `curtiu seu post "${post.title}"`.slice(0, 120),
          url: `/post/${postId}`,
        }),
      }).catch(() => {})
    }

    setTimeout(() => setVotingPost(null), 300)
  }

  async function handleRepost(postId: string) {
    if (!userId) return
    const isReposted = repostedIds.has(postId)
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const delta = isReposted ? -1 : 1
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, reposts_count: (p.reposts_count ?? 0) + delta } : p
      )
    )
    setRepostedIds((prev) => {
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
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    toast.success('Post excluído.')
  }

  return (
    <main className="vtx-feed-page" style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)' }}>
      <BackgroundGradient variant="feed" />
      <Nav />

      <div className="vtx-reddit-shell" style={{ position: 'relative', zIndex: 2 }}>
        <section className="vtx-feed-column">
          <header className="vtx-feed-heading">
            <div className="vtx-feed-heading-copy">
              <h1>Início</h1>
              <p>Comunidades, pessoas e conversas em um fluxo mais limpo.</p>
            </div>
            <button className="vtx-feed-search-trigger" onClick={() => router.push('/search')}>
              <Search size={15} />
              <span>Buscar no VORTEX</span>
            </button>
          </header>

          <FeedComposer username={profileSummary.username} avatarUrl={profileSummary.avatar_url} />

          {userId && (
            <div className="vtx-stories-shell">
              <StoriesBar currentUserId={userId} />
            </div>
          )}

          <div className="vtx-feed-controls" aria-label="Controles do feed">
            <div className="vtx-feed-controls-left">
              <div className="vtx-feed-tabs">
              <button
                className={`vtx-feed-tab ${tab === 'geral' ? 'is-active' : ''}`}
                onClick={() => switchTab('geral')}
              >
                <Globe2 size={15} />
                <span>Geral</span>
              </button>
              <button
                className={`vtx-feed-tab ${tab === 'seguindo' ? 'is-active' : ''}`}
                onClick={() => switchTab('seguindo')}
              >
                <Users2 size={15} />
                <span>Seguindo</span>
              </button>
              </div>

              <FeedSortMenu value={sortMode} onChange={changeSort} />
            </div>

            <div className="vtx-view-switch" aria-label="Modo de visualização">
              <button
                className={`vtx-view-btn ${viewMode === 'card' ? 'is-active' : ''}`}
                onClick={() => changeView('card')}
                aria-label="Visualização em cartões"
                title="Cartões"
              >
                <Rows3 size={16} />
              </button>
              <button
                className={`vtx-view-btn ${viewMode === 'compact' ? 'is-active' : ''}`}
                onClick={() => changeView('compact')}
                aria-label="Visualização compacta"
                title="Compacto"
              >
                <LayoutList size={16} />
              </button>
              <button
                className="vtx-refresh-btn"
                onClick={() => { resetCursor(); loadPosts(tab, sortMode, null, true) }}
                aria-label="Atualizar feed"
                title="Atualizar"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading && (
            <div>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && tab === 'seguindo' && posts.length === 0 && (
            <>
              <EmptyState
                icon="👥"
                title="Seu feed de seguindo está vazio."
                subtitle="Siga pessoas para montar um feed só com quem você acompanha."
              />
              <FeedDiscoveryEnd empty />
            </>
          )}

          {!loading && tab === 'geral' && posts.length === 0 && (
            <>
              <EmptyState
                icon="🌀"
                title="Nenhuma conversa por aqui ainda."
                subtitle="Crie a primeira publicação e encontre pessoas e comunidades abaixo."
              />
              <FeedDiscoveryEnd empty />
            </>
          )}

          {posts.map((item, i) => {
            const position = i + 1
            const showAd =
              userPlan === 'free' &&
              position % AD_INTERVAL === 0 &&
              feedAds.length > 0
            const adToShow = showAd
              ? feedAds[Math.floor(position / AD_INTERVAL - 1) % feedAds.length]
              : null

            return (
              <PostCard
                key={item.activityId}
                post={item}
                index={i}
                viewMode={viewMode}
                voteType={votes.get(item.id) ?? null}
                isReposted={repostedIds.has(item.id)}
                isRepostFeedItem={item.isRepost}
                repostedByUsername={item.repostedByUsername}
                showAd={!!showAd}
                adToShow={adToShow}
                adPosition={position}
                isAdmin={isAdmin}
                onVote={handleVote}
                onRepost={handleRepost}
                onShare={handleShare}
                onReport={handleReportPost}
                onAdminDelete={handleAdminDelete}
              />
            )
          })}

          <div ref={loaderRef} style={{ height: 1 }} />

          {loadingMore && (
            <div>
              {[0, 1].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <FeedDiscoveryEnd />
          )}
        </section>

        <FeedRightRail />
      </div>
    </main>
  )
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: 'var(--text-2)',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text)',
          fontFamily: "'Syne', sans-serif",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14 }}>{subtitle}</div>
    </div>
  )
}