'use client'

/**
 * MobileMenu — menu hamburger fullscreen, animação suave.
 *
 * Bloqueia scroll do body enquanto tá aberto, fecha com Esc,
 * trap básico de focus no primeiro link, e respeita reduced-motion.
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'

type MobileMenuProps = {
  open: boolean
  onClose: () => void
  links: Array<{ label: string; href: string }>
}

export default function MobileMenu({ open, onClose, links }: MobileMenuProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return

    // Trava scroll do body enquanto tá aberto
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Esc fecha
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    // Foca no primeiro link
    setTimeout(() => firstLinkRef.current?.focus(), 50)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <nav
      className={`vtx-mobile-menu ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Menu principal"
    >
      {links.map((link, i) => (
        <Link
          key={link.href}
          href={link.href}
          ref={i === 0 ? firstLinkRef : undefined}
          onClick={onClose}
          className="tap-highlight"
          style={{
            fontFamily: "'Syne', sans-serif",
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--green)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
        >
          {link.label}
        </Link>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={onClose}
        aria-label="Fechar menu"
        className="tap-highlight"
        style={{
          marginTop: 24,
          padding: '14px 20px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-2)',
          borderRadius: 12,
          color: 'var(--text-2)',
          fontFamily: "'Syne', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.04em',
        }}
      >
        FECHAR ✕
      </button>
    </nav>
  )
}
