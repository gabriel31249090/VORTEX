'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RippleButton from './RippleButton'
import FeedAd from './FeedAd'
import ReportModal, { type ReportReason } from './ReportModal'
import { likeBurst } from '@/lib/animations'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'

type PlanId = 'free' | 'boost' | 'mega'
type VoteType = 'up' | 'down' | null

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

const DOWNVOTE_COLOR = '#ff4466'

export interface PostCardProps {
  post: Post
  index: number
  voteType: VoteType
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
  const authorAccent = post.profiles?.accent_color || null
  const planStyle = getPlanStyle(authorPlan, authorAccent)
  const authorColor = getAuthorColor(authorPlan, authorAccent)
  const isMega = authorPlan === 'mega'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isRepostFeedItem && repostedByUsername && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#555577', fontSize: 13, paddingLeft: 4 }}>
          <span>🔁</span>
          <span>@{repostedByUsername} republicou</span>
        </div>
      )}

      <article
        className="vtx-card"
        style={{
          background: '#111118',
          border: planStyle.border,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: planStyle.shadow,
          animation: `fadeUp 0.4s ease ${Math.min(index, 5) * 0.05}s both`,
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

            {/* Menu de opções */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                style={{
                  background: 'none', border: 'none', color: '#555577', cursor: 'pointer',
                  fontSize: 18, padding: '2px 6px', lineHeight: 1, borderRadius: 6,
                }}
              >
                ⋯
              </button>
              {menuOpen && (
                <>
                  <div
                    onClick={() => setMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                  />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 10,
                    background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, overflow: 'hidden', minWidth: 160,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    <button
                      onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none',
                        border: 'none', color: '#8888aa', cursor: 'pointer', fontSize: 13,
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      🚩 Denunciar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setMenuOpen(false); if (confirm('Excluir este post como admin?')) onAdminDelete(post.id) }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none',
                          border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
                          color: '#ff4466', cursor: 'pointer', fontSize: 13,
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        🗑️ Excluir (admin)
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div onClick={() => router.push(`/post/${post.id}`)} style={{ cursor: 'pointer' }}>
            <h2 style={isMega ? {
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 700,
              fontSize: 18, marginBottom: 8, lineHeight: 1.3,
              backgroundImage: `linear-gradient(100deg, ${authorColor}, #f0f0f8 55%, ${authorColor})`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              WebkitTextFillColor: 'transparent',
              animation: 'megaShine 6s ease infinite',
              transition: 'color 0.2s',
            } : {
              color: '#f0f0f8',
              fontWeight: 700, fontSize: 17, marginBottom: 8, lineHeight: 1.3,
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>

            <div style={{
              display: 'flex', alignItems: 'center',
              background: voteType ? (voteType === 'up' ? `${authorColor}1a` : `${DOWNVOTE_COLOR}1a`) : 'transparent',
              border: `1px solid ${voteType ? (voteType === 'up' ? `${authorColor}66` : `${DOWNVOTE_COLOR}66`) : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 50, overflow: 'hidden',
              boxShadow: voteType ? `0 0 10px ${(voteType === 'up' ? authorColor : DOWNVOTE_COLOR)}33` : 'none',
              transition: 'all 0.2s',
            }}>
              <RippleButton
                onClick={(e) => { likeBurst(e.currentTarget as HTMLElement); onVote(post.id, 'up') }}
                className="vtx-btn"
                rippleColor={`${authorColor}55`}
                style={{
                  background: 'transparent', border: 'none',
                  color: voteType === 'up' ? authorColor : '#555577',
                  padding: '5px 10px', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                }}
              >
                <span className="vtx-icon-wiggle">▲</span>
              </RippleButton>

              <span style={{
                fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center',
                color: voteType ? (voteType === 'up' ? authorColor : DOWNVOTE_COLOR) : '#8888aa',
              }}>
                {animatedScore}
              </span>

              <RippleButton
                onClick={(e) => { likeBurst(e.currentTarget as HTMLElement); onVote(post.id, 'down') }}
                className="vtx-btn"
                rippleColor={`${DOWNVOTE_COLOR}55`}
                style={{
                  background: 'transparent', border: 'none',
                  color: voteType === 'down' ? DOWNVOTE_COLOR : '#555577',
                  padding: '5px 10px', cursor: 'pointer',
                  fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                }}
              >
                ▼
              </RippleButton>
            </div>

            <RippleButton
              onClick={() => router.push(`/post/${post.id}`)}
              className="vtx-btn"
              rippleColor="rgba(200,242,60,0.2)"
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
            </RippleButton>

            <RippleButton
              onClick={() => onRepost(post.id)}
              className="vtx-btn"
              rippleColor="rgba(200,242,60,0.2)"
              style={{
                background: isReposted ? 'rgba(200,242,60,0.1)' : 'transparent',
                border: `1px solid ${isReposted ? 'rgba(200,242,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: isReposted ? '#c8f23c' : '#555577',
                padding: '5px 12px', borderRadius: 50, cursor: 'pointer',
                fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
              }}
            >
              🔁 {post.reposts_count ?? 0}
            </RippleButton>

            <RippleButton
              onClick={() => onShare(post.id)}
              className="vtx-btn"
              rippleColor="rgba(200,242,60,0.2)"
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
            </RippleButton>
          </div>
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
