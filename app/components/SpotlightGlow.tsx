'use client'

/**
 * SpotlightGlow — wraps any container (nav, tab bar, card row) and adds a
 * soft radial glow that follows the mouse, in VORTEX green. Adapted from a
 * generic "SpotlightNavbar" component into a vanilla, reusable wrapper
 * (no framer-motion) — same DOM-manipulation pattern as RippleButton.
 *
 * Usage:
 *   <SpotlightGlow style={{ borderRadius: 12 }}>
 *     <YourExistingTabsOrNav />
 *   </SpotlightGlow>
 */

import React, { useRef } from 'react'

export interface SpotlightGlowProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Glow color. Defaults to VORTEX green. */
  color?: string
  /** Radius of the spotlight circle in px. */
  radius?: number
}

export function SpotlightGlow({
  children,
  className,
  style,
  color = '200,242,60', // #c8f23c in rgb, so we can control alpha
  radius = 140,
}: SpotlightGlowProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect || !glowRef.current) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    glowRef.current.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, rgba(${color},0.16) 0%, transparent 70%)`
    glowRef.current.style.opacity = '1'
  }

  const handleMouseLeave = () => {
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.25s ease',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

export default SpotlightGlow
