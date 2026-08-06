'use client'

/**
 * ScrambleText — scramble-reveal heading for VORTEX section titles.
 *
 * On scroll into view, each character cycles through random glitch
 * characters before locking into place, left to right. On hover, a
 * small radius of characters around the cursor scrambles briefly.
 *
 * This is a trimmed-down port: the full-feature version (multi-line
 * waves, flicker colors, collapse timing, etc.) can be built out further
 * if you want more control later — this covers what section titles need.
 *
 * Usage:
 *   <ScrambleText as="h2" text="Seu Feed" className="section-title" />
 */

import { useEffect, useRef, useState, type ElementType } from 'react'

type ScrambleTextProps = {
  text: string
  as?: ElementType
  className?: string
  /** Resting text color. Defaults to VORTEX text color. */
  color?: string
  /** Color shown while a character is still scrambling. Defaults to VORTEX green. */
  glitchColor?: string
  /** Total reveal duration in seconds. */
  duration?: number
  /** Character pool used while scrambling. */
  scrambleChars?: string
  /** 'inView' triggers on scroll into view (once); 'mount' triggers immediately. */
  trigger?: 'inView' | 'mount'
  /** How many characters around the cursor glitch on hover. */
  hoverRadius?: number
}

const DEFAULT_SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/\\'

export default function ScrambleText({
  text,
  as: Tag = 'span',
  className,
  color = 'var(--text, #f0f0f8)',
  glitchColor = 'var(--green, #c8f23c)',
  duration = 1.1,
  scrambleChars = DEFAULT_SCRAMBLE_CHARS,
  trigger = 'inView',
  hoverRadius = 2,
}: ScrambleTextProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const hasPlayedRef = useRef(false)
  const hoverTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const [displayChars, setDisplayChars] = useState<string[]>(() =>
    trigger === 'mount' ? text.split('') : text.split('').map(() => '')
  )
  const [locked, setLocked] = useState<boolean[]>(() =>
    text.split('').map(() => trigger === 'mount')
  )
  // Tracks the text this component was last showing, so a prop change can be
  // detected and reacted to directly during render (React's documented
  // pattern for "adjusting state when a prop changes") instead of via a
  // setState-in-effect, which forces an extra synchronous re-render pass.
  const [prevText, setPrevText] = useState(text)
  if (text !== prevText) {
    setPrevText(text)
    setDisplayChars(text.split('').map(() => ''))
    setLocked(text.split('').map(() => false))
  }

  const randomChar = () =>
    scrambleChars[Math.floor(Math.random() * scrambleChars.length)]

  // Reset the "already played" flag when text changes. This only mutates a
  // ref (not state), so doing it in an effect is fine.
  useEffect(() => {
    hasPlayedRef.current = false
  }, [text])

  // Scramble-in animation
  const playReveal = () => {
    if (hasPlayedRef.current) return
    hasPlayedRef.current = true

    const chars = text.split('')
    const total = chars.length || 1
    const durationMs = duration * 1000
    const start = performance.now()

    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []

    chars.forEach((char, i) => {
      if (char === ' ') {
        setDisplayChars((prev) => {
          const next = [...prev]
          next[i] = ' '
          return next
        })
        setLocked((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
        return
      }

      const lockAt = start + durationMs * ((i + 1) / total)
      const flickerCount = 3 + Math.floor(Math.random() * 4)
      const flickerWindow = Math.max(30, (lockAt - performance.now()) / flickerCount)

      for (let f = 0; f < flickerCount; f++) {
        const t = setTimeout(() => {
          if (cancelled) return
          setDisplayChars((prev) => {
            const next = [...prev]
            next[i] = randomChar()
            return next
          })
        }, f * flickerWindow)
        timers.push(t)
      }

      const lockTimer = setTimeout(() => {
        if (cancelled) return
        setDisplayChars((prev) => {
          const next = [...prev]
          next[i] = char
          return next
        })
        setLocked((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, lockAt - start)
      timers.push(lockTimer)
    })

    hoverTimersRef.current.push(...timers)
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }

  useEffect(() => {
    if (trigger === 'mount') {
      playReveal()
      return
    }
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playReveal()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, text])

  useEffect(() => {
    return () => {
      hoverTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  // Hover glitch: scramble a few characters around the cursor briefly
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hasPlayedRef.current) return
    const chars = charRefs.current
    let closest = -1
    let minDist = Infinity
    chars.forEach((el, i) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const dist = Math.abs(e.clientX - cx)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    })
    if (closest === -1) return

    for (
      let i = Math.max(0, closest - hoverRadius);
      i <= Math.min(chars.length - 1, closest + hoverRadius);
      i++
    ) {
      const original = text[i]
      if (!original || original === ' ') continue
      setDisplayChars((prev) => {
        const next = [...prev]
        next[i] = randomChar()
        return next
      })
      const t = setTimeout(() => {
        setDisplayChars((prev) => {
          const next = [...prev]
          next[i] = original
          return next
        })
      }, 150 + Math.random() * 150)
      hoverTimersRef.current.push(t)
    }
  }

  return (
    <Tag
      ref={containerRef as never}
      className={className}
      onMouseMove={handleMouseMove}
      style={{ display: 'inline-block' }}
    >
      {text.split('').map((char, i) => (
        <span
          key={i}
          ref={(el) => {
            charRefs.current[i] = el
          }}
          style={{
            color: locked[i] ? color : glitchColor,
            transition: 'color 0.15s ease',
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}
        >
          {displayChars[i] || '\u00A0'}
        </span>
      ))}
    </Tag>
  )
}
