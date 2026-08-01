'use client'

import { useEffect, useRef, useState } from 'react'

type StoryProfile = { id: string; username: string; avatar_url: string | null }
type Story = { id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; created_at: string }
export type StoryGroup = { user: StoryProfile; stories: Story[] }

const IMAGE_DURATION = 5000

export default function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)

  const current = group.stories[index]

  function goNext() {
    if (index < group.stories.length - 1) setIndex(i => i + 1)
    else onClose()
  }
  function goPrev() {
    if (index > 0) setIndex(i => i - 1)
  }

  useEffect(() => {
    setProgress(0)
    startRef.current = performance.now()

    if (current.media_type === 'video') return // vídeo avança sozinho via onEnded

    function tick(now: number) {
      const elapsed = now - startRef.current
      const pct = Math.min(1, elapsed / IMAGE_DURATION)
      setProgress(pct)
      if (pct >= 1) {
        goNext()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100%', maxHeight: 820 }}>
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 4, zIndex: 3 }}>
          {group.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#c8f23c',
                width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', top: 24, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 8, zIndex: 3 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: '#1a1a28', flexShrink: 0 }}>
            {group.user.avatar_url && (
              <img src={group.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, fontFamily: "'Syne', sans-serif" }}>
            @{group.user.username}
          </span>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {current.media_type === 'video' ? (
          <video
            key={current.id}
            src={current.media_url}
            autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            onEnded={goNext}
          />
        ) : (
          <img
            key={current.id}
            src={current.media_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        )}

        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={goPrev} />
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={goNext} />
        </div>
      </div>
    </div>
  )
}
