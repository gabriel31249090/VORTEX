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
import BackgroundGradient from '../components/BackgroundGradient'

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
}
type FeedTab = 'geral' | 'seguindo'

const PAGE_SIZE = 15
const AD_INTERVAL = 40

function SkeletonCard() {
  return (
    <div
      className="surface"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        marginBottom: 16,
        minHeight: 200,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
          animation: 'shimmer 1.4s infinite',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--surface-3)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: 120,
              height: 12,
              borderRadius: 4,
              background: 'var(--surface-3)',
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: 80,
              height: 10,
              borderRadius: 4,
              background: 'var(--surface-2)',
            }}
          />
        </div>
      </div>
      <div
        style={{
          width: '90%',
          height: 14,
          borderRadius: 4,
          background: 'var(--surface-3)',
          marginBottom: 8,
        }}
      />
      <div
        style={{
          width: '70%',
          height: 14,
          borderRadius: 4,
          background: 'var(--surface-3)',
          marginBottom: 8,
        }}
      />
      <div
        style={{
          width: '50%',
          height: 14,
          borderRadius: 4,
          background: 'var(--surface-3)',
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
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
  const [cursor, setCursor] = useState<string | null>(null)
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
        .select('plan, is_admin')
        .eq('id', user.id)
        .single()
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

      await loadPosts('geral', null, true)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  async function loadPosts(feedTab: FeedTab, cursorAt: string | null, replace = false) {
    if (replace) setLoading(true)
    else setLoadingMore(true)

    const { data, error } = await supabase.rpc('feed_page', {
      feed_mode: feedTab,
      cursor_at: cursorAt,
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

    setCursor(rows.length ? rows[rows.length - 1].activity_at : cursorAt)
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
        loadPosts(tab, cursor, false)
      }
    }, { threshold: 0.1 })
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, cursor, userId, tab])

  function switchTab(newTab: FeedTab) {
    setTab(newTab)
    setCursor(null)
    setHasMore(true)
    setPosts([])
    if (userId) loadPosts(newTab, null, true)
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
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      {/* Background leve (CSS puro, 0kb JS) — substitui o BlackHoleBackground */}
      <BackgroundGradient variant="feed" />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="vtx-shell">
          <div style={{ width: '100%', maxWidth: 720 }}>
            {userId && <StoriesBar currentUserId={userId} />}

            <div style={{ paddingTop: 16, paddingBottom: 64 }}>
              <Nav />

          {/* Tabs */}
          <div
            className="vtx-feed-toolbar"
            style={{
              display: 'flex',
              gap: 8,
              margin: '24px 0',
              padding: 4,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          >
            {(['geral', 'seguindo'] as FeedTab[]).map((t) => (
              <RippleButton
                key={t}
                onClick={() => switchTab(t)}
                className={tab === t ? 'vtx-btn-glow' : 'vtx-btn'}
                rippleColor={tab === t ? 'rgba(0,0,0,0.25)' : 'rgba(200,242,60,0.25)'}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  background: tab === t ? '#c8f23c' : 'transparent',
                  color: tab === t ? '#000' : '#8888aa',
                }}
              >
                {t === 'geral' ? '🌐 Geral' : '👥 Seguindo'}
              </RippleButton>
            ))}
            <RippleButton
              onClick={() => loadPosts(tab, null, true)}
              className="vtx-btn"
              rippleColor="rgba(200,242,60,0.2)"
              aria-label="Atualizar feed"
              title="Atualizar feed"
              style={{
                width: 42,
                flexShrink: 0,
                borderRadius: 9,
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.03)',
                color: '#8888aa',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ↻
            </RippleButton>
          </div>

          {loading && (
            <div>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!loading && tab === 'seguindo' && posts.length === 0 && (
            <EmptyState
              icon="👥"
              title="Você ainda não segue ninguém."
              subtitle="Siga pessoas para ver os posts delas aqui."
            />
          )}

          {!loading && tab === 'geral' && posts.length === 0 && (
            <EmptyState
              icon="🌀"
              title="Nenhum post ainda."
              subtitle="Seja o primeiro!"
            />
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
              <div key={item.activityId}>
                <PostCard
                  post={item}
                  index={i}
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
              </div>
            )
          })}

          <div ref={loaderRef} style={{ height: 1 }} />

          {loadingMore && (
            <div>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--text-3)',
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Você chegou ao fim ✦
            </div>
          )}
        </div>
          </div>
        </div>
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