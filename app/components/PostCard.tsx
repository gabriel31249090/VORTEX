'use client'

import { useState, type CSSProperties, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import FeedAd from './FeedAd'
import ReportModal, { type ReportReason } from './ReportModal'
import { likeBurst } from '@/lib/animations'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import {
  ArrowBigDown,
  ArrowBigUp,
  Crown,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Play,
  Repeat2,
  Share2,
  Trash2,
  Zap,
} from 'lucide-react'

type PlanId = 'free' | 'boost' | 'mega'
type VoteType = 'up' | 'down' | null
export type FeedViewMode = 'card' | 'compact'

type Post = {
  id: string
  title: string
  content: string
  type: string
  media_url: string | null
  likes_count: number
  comments_count: number
  reposts_count?: number
  created_at: string
  author_id: string
  profiles: { username: string; avatar_url: string | null; plan: PlanId; accent_color: string | null } | null
  communities: { name: string; slug: string } | null
}

function isVideo(url: string) {
  return /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)
}

function getAuthorColor(plan: PlanId, accentColor: string | null) {
  if ((plan === 'boost' || plan === 'mega') && accentColor) return accentColor
  if (plan === 'mega') return '#a78bfa'
  return '#c8f23c'
}

function getInitial(username: string) {
  return username?.charAt(0).toUpperCase() || '?'
}

function timeAgo(date: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const DOWNVOTE_COLOR = '#ff5b78'

export interface PostCardProps {
  post: Post
  index: number
  voteType: VoteType
  viewMode: FeedViewMode
  onVote: (postId: string, type: 'up' | 'down') => void
  onShare: (postId: string) => void
  onRepost: (postId: string) => void
  isReposted: boolean
  isRepostFeedItem?: boolean
  repostedByUsername?: string | null
  showAd: boolean
  adToShow: { id: string; title: string; description: string | null; image_url: string | null; link_url: string } | null
  adPosition: number
  isAdmin: boolean
  onReport: (postId: string, reason: ReportReason, details: string) => void | Promise<void>
  onAdminDelete: (postId: string) => void | Promise<void>
}

export default function PostCard({
  post,
  index,
  voteType,
  viewMode,
  onVote,
  onShare,
  onRepost,
  isReposted,
  isRepostFeedItem,
  repostedByUsername,
  showAd,
  adToShow,
  adPosition,
  isAdmin,
  onReport,
  onAdminDelete,
}: PostCardProps) {
  const router = useRouter()
  const animatedScore = useAnimatedCounter(post.likes_count)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const authorPlan: PlanId = post.profiles?.plan || 'free'
  const authorColor = getAuthorColor(authorPlan, post.profiles?.accent_color || null)
  const hasMedia = Boolean(post.media_url)
  const video = post.media_url ? isVideo(post.media_url) : false

  const goToPost = () => router.push(`/post/${post.id}`)

  const vote = (event: MouseEvent<HTMLElement>, type: 'up' | 'down') => {
    event.stopPropagation()
    likeBurst(event.currentTarget as HTMLElement)
    onVote(post.id, type)
  }

  const Menu = () => (
    <div className="vtx-post-menu-wrap">
      <button
        className="vtx-post-icon-btn"
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((value) => !value)
        }}
        aria-label="Mais opções"
        title="Mais opções"
      >
        <MoreHorizontal size={18} />
      </button>
      {menuOpen && (
        <>
          <button
            className="vtx-post-menu-scrim"
            aria-label="Fechar menu"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen(false)
            }}
          />
          <div className="vtx-post-menu">
            <button
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen(false)
                setReportOpen(true)
              }}
            >
              <Flag size={14} /> Denunciar
            </button>
            {isAdmin && (
              <button
                className="vtx-post-menu-danger"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  if (confirm('Excluir este post como admin?')) onAdminDelete(post.id)
                }}
              >
                <Trash2 size={14} /> Excluir (admin)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="vtx-feed-entry">
      {isRepostFeedItem && repostedByUsername && (
        <div className="vtx-repost-label">
          <Repeat2 size={13} />
          <span>@{repostedByUsername} republicou</span>
        </div>
      )}

      <article
        className={`vtx-reddit-post vtx-reddit-post--${viewMode}`}
        style={{
          '--author-accent': authorColor,
          animationDelay: `${Math.min(index, 5) * 25}ms`,
        } as CSSProperties}
      >
        <aside className="vtx-vote-rail" aria-label="Votação">
          <button
            className={`vtx-vote-btn ${voteType === 'up' ? 'is-up' : ''}`}
            onClick={(event) => vote(event, 'up')}
            aria-label="Votar positivamente"
            title="Votar positivamente"
          >
            <ArrowBigUp size={20} />
          </button>
          <span className={`vtx-vote-score ${voteType ? `is-${voteType}` : ''}`}>{animatedScore}</span>
          <button
            className={`vtx-vote-btn vtx-vote-btn--down ${voteType === 'down' ? 'is-down' : ''}`}
            onClick={(event) => vote(event, 'down')}
            aria-label="Votar negativamente"
            title="Votar negativamente"
          >
            <ArrowBigDown size={20} />
          </button>
        </aside>

        <div className="vtx-post-main">
          <header className="vtx-post-meta">
            <button
              className="vtx-post-avatar"
              onClick={(event) => {
                event.stopPropagation()
                if (post.profiles?.username) router.push(`/profile/${post.profiles.username}`)
              }}
              aria-label={`Abrir perfil de ${post.profiles?.username || 'usuário'}`}
              style={{ '--author-accent': authorColor } as CSSProperties}
            >
              {post.profiles?.avatar_url ? (
                <Image src={post.profiles.avatar_url} alt="" fill sizes="24px" style={{ objectFit: 'cover' }} />
              ) : (
                getInitial(post.profiles?.username || '?')
              )}
            </button>

            <div className="vtx-post-meta-line">
              {post.communities ? (
                <button
                  className="vtx-community-link"
                  onClick={(event) => {
                    event.stopPropagation()
                    router.push(`/community/${post.communities!.slug}`)
                  }}
                >
                  v/{post.communities.name}
                </button>
              ) : (
                <span className="vtx-community-link vtx-community-link--plain">v/geral</span>
              )}
              <span className="vtx-meta-dot">•</span>
              <span className="vtx-posted-by">por</span>
              <button
                className="vtx-author-link"
                onClick={(event) => {
                  event.stopPropagation()
                  if (post.profiles?.username) router.push(`/profile/${post.profiles.username}`)
                }}
              >
                @{post.profiles?.username || 'usuário'}
              </button>

              {authorPlan !== 'free' && (
                <span className={`vtx-plan-mini vtx-plan-mini--${authorPlan}`} title={authorPlan === 'mega' ? 'MEGA BOOST' : 'BOOST'}>
                  {authorPlan === 'mega' ? <Crown size={11} /> : <Zap size={11} />}
                </span>
              )}

              <span className="vtx-meta-dot">•</span>
              <span className="vtx-post-time">{timeAgo(post.created_at)}</span>
            </div>

            <Menu />
          </header>

          <div className={`vtx-post-content-grid ${hasMedia && viewMode === 'compact' ? 'has-thumbnail' : ''}`}>
            <button className="vtx-post-copy" onClick={goToPost}>
              <h2>{post.title}</h2>
              {post.content && (
                <p className="vtx-post-excerpt">{post.content}</p>
              )}
            </button>

            {post.media_url && viewMode === 'compact' && (
              <button className="vtx-post-thumb" onClick={goToPost} aria-label="Abrir mídia da publicação">
                {video ? (
                  <span className="vtx-post-thumb-video">
                    <Play size={22} fill="currentColor" />
                  </span>
                ) : (
                  <Image
                    src={post.media_url}
                    alt=""
                    fill
                    sizes="112px"
                    style={{ objectFit: 'cover' }}
                  />
                )}
              </button>
            )}
          </div>

          {post.media_url && viewMode === 'card' && (
            <div className="vtx-post-media">
              {video ? (
                <video
                  src={post.media_url}
                  controls
                  preload="metadata"
                  onClick={(event) => event.stopPropagation()}
                />
              ) : (
                <button onClick={goToPost} className="vtx-post-media-button" aria-label="Abrir publicação">
                  <Image
                    src={post.media_url}
                    alt={post.title}
                    width={1280}
                    height={960}
                    sizes="(max-width: 820px) 100vw, 760px"
                    style={{ width: '100%', height: 'auto', maxHeight: 620, objectFit: 'contain', display: 'block' }}
                  />
                </button>
              )}
            </div>
          )}

          <footer className="vtx-post-actions">
            <div className="vtx-mobile-vote">
              <button
                className={voteType === 'up' ? 'is-up' : ''}
                onClick={(event) => vote(event, 'up')}
                aria-label="Votar positivamente"
              >
                <ArrowBigUp size={17} />
              </button>
              <strong className={voteType ? `is-${voteType}` : ''}>{animatedScore}</strong>
              <button
                className={voteType === 'down' ? 'is-down' : ''}
                onClick={(event) => vote(event, 'down')}
                aria-label="Votar negativamente"
              >
                <ArrowBigDown size={17} />
              </button>
            </div>

            <button className="vtx-action-btn" onClick={goToPost}>
              <MessageCircle size={16} />
              <span>{post.comments_count}</span>
              <span className="vtx-action-label">Comentários</span>
            </button>

            <button
              className={`vtx-action-btn ${isReposted ? 'is-active' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onRepost(post.id)
              }}
            >
              <Repeat2 size={16} />
              <span>{post.reposts_count ?? 0}</span>
              <span className="vtx-action-label">Republicar</span>
            </button>

            <button
              className="vtx-action-btn"
              onClick={(event) => {
                event.stopPropagation()
                onShare(post.id)
              }}
            >
              <Share2 size={16} />
              <span className="vtx-action-label">Compartilhar</span>
            </button>
          </footer>
        </div>
      </article>

      {showAd && adToShow && <FeedAd key={`ad-${adPosition}`} ad={adToShow} />}

      {reportOpen && (
        <ReportModal
          title="Denunciar post"
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason, details) => {
            await onReport(post.id, reason, details)
            setReportOpen(false)
          }}
        />
      )}
    </div>
  )
}
