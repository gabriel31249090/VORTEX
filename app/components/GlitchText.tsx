'use client'

/**
 * GlitchText — ASCII scramble-ripple effect on hover.
 * Adapted for VORTEX (dark neon, Syne font) from a generic component.
 * 100% vanilla — no new dependencies.
 *
 * Usage:
 *   <GlitchText as="span" className="vtx-nav-link">Feed</GlitchText>
 *   <GlitchText as="h2" color="#f0f0f8" glitchColor="#c8f23c">Título</GlitchText>
 */

import React, { useEffect, useRef } from 'react'

const WAVE_THRESH = 3
const CHAR_MULT = 3
const ANIM_STEP = 40
const WAVE_BUF = 5

export interface GlitchTextProps
  extends React.AnchorHTMLAttributes<HTMLElement> {
  children: string
  as?: any
  className?: string
  style?: React.CSSProperties
  /** Duration of each ripple wave in ms. */
  dur?: number
  /** Character set used while scrambling. */
  chars?: string
  preserveSpaces?: boolean
  /** Spread of the wave — larger = wider ripple. */
  spread?: number
  /** Resting text color. Defaults to VORTEX text color. */
  color?: string
  /** Color shown while scrambling. Defaults to VORTEX green. */
  glitchColor?: string
}

const DEFAULT_CHARS = '01#$%&*+=~·-░▒▓█▄▀▌▐■<>/\\'

export function GlitchText({
  children,
  as = 'span',
  className,
  style,
  dur = 900,
  chars = DEFAULT_CHARS,
  preserveSpaces = true,
  spread = 1.0,
  color = '#f0f0f8',
  glitchColor = '#c8f23c',
  ...props
}: GlitchTextProps) {
  const Component = as
  const elRef = useRef<any>(null)

  const stateRef = useRef({
    origTxt: children,
    origChars: children.split(''),
    isAnim: false,
    cursorPos: 0,
    waves: [] as Array<{ startPos: number; startTime: number; id: number }>,
    animId: null as number | null,
    isHover: false,
    origW: null as number | null,
  })

  useEffect(() => {
    stateRef.current.origTxt = children
    stateRef.current.origChars = children.split('')
    if (!stateRef.current.isAnim && elRef.current) {
      elRef.current.textContent = children
    }
  }, [children])

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    el.textContent = children

    const updateCursorPos = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const len = stateRef.current.origTxt.length
      const pos = Math.round((x / rect.width) * len)
      stateRef.current.cursorPos = Math.max(0, Math.min(pos, len - 1))
    }

    const stop = () => {
      el.textContent = stateRef.current.origTxt
      el.style.color = color
      if (stateRef.current.origW !== null) {
        el.style.width = ''
        stateRef.current.origW = null
      }
      stateRef.current.isAnim = false
      if (stateRef.current.animId) {
        cancelAnimationFrame(stateRef.current.animId)
        stateRef.current.animId = null
      }
    }

    const start = () => {
      if (stateRef.current.isAnim) return
      if (stateRef.current.origW === null) {
        stateRef.current.origW = el.getBoundingClientRect().width
        el.style.width = `${stateRef.current.origW}px`
      }
      stateRef.current.isAnim = true
      el.style.color = glitchColor

      const animate = () => {
        const t = Date.now()
        stateRef.current.waves = stateRef.current.waves.filter(
          (w) => t - w.startTime < dur
        )
        if (stateRef.current.waves.length === 0) {
          stop()
          return
        }
        el.textContent = genScrambledTxt(t)
        stateRef.current.animId = requestAnimationFrame(animate)
      }
      stateRef.current.animId = requestAnimationFrame(animate)
    }

    const startWave = () => {
      stateRef.current.waves.push({
        startPos: stateRef.current.cursorPos,
        startTime: Date.now(),
        id: Math.random(),
      })
      if (!stateRef.current.isAnim) start()
    }

    const calcWaveEffect = (charIdx: number, t: number) => {
      let shouldAnim = false
      let resultChar = stateRef.current.origChars[charIdx]

      for (const w of stateRef.current.waves) {
        const age = t - w.startTime
        const prog = Math.min(age / dur, 1)
        const dist = Math.abs(charIdx - w.startPos)
        const maxDist = Math.max(
          w.startPos,
          stateRef.current.origChars.length - w.startPos - 1
        )
        const rad = (prog * (maxDist + WAVE_BUF)) / spread

        if (dist <= rad) {
          shouldAnim = true
          const intens = Math.max(0, rad - dist)
          if (intens <= WAVE_THRESH && intens > 0) {
            const index =
              (dist * CHAR_MULT + Math.floor(age / ANIM_STEP)) % chars.length
            resultChar = chars[index]
          }
        }
      }
      return { shouldAnim, char: resultChar }
    }

    const genScrambledTxt = (t: number) =>
      stateRef.current.origChars
        .map((char, i) => {
          if (preserveSpaces && char === ' ') return ' '
          const res = calcWaveEffect(i, t)
          return res.shouldAnim ? res.char : char
        })
        .join('')

    const handleEnter = (e: MouseEvent) => {
      stateRef.current.isHover = true
      updateCursorPos(e)
      startWave()
    }
    const handleMove = (e: MouseEvent) => {
      if (!stateRef.current.isHover) return
      const old = stateRef.current.cursorPos
      updateCursorPos(e)
      if (stateRef.current.cursorPos !== old) startWave()
    }
    const handleLeave = () => {
      stateRef.current.isHover = false
    }

    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)

    return () => {
      el.removeEventListener('mouseenter', handleEnter)
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
      if (stateRef.current.animId) cancelAnimationFrame(stateRef.current.animId)
    }
  }, [children, dur, chars, preserveSpaces, spread, color, glitchColor])

  return (
    <Component
      ref={elRef}
      className={className}
      style={{
        cursor: 'pointer',
        userSelect: 'none',
        display: 'inline-block',
        color,
        transition: 'color 0.2s ease',
        fontFamily: "'Syne', sans-serif",
        ...style,
      }}
      {...props}
    />
  )
}

export default GlitchText
