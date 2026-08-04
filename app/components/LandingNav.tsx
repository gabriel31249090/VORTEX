'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: scrolled ? '12px 24px' : '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
        background: scrolled ? 'rgba(10,10,15,0.7)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div
          style={{
            fontFamily: 'var(--font)',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'var(--text)',
          }}
        >
          VORTEX<span style={{ color: 'var(--green)' }}>.</span>
        </div>
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}
      >
        <NavLink href="#features">Recursos</NavLink>
        <NavLink href="/pricing">Preços</NavLink>
        <NavLink href="/login">Entrar</NavLink>
        <Link
          href="/register"
          className="neon-btn"
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          Criar conta
        </Link>
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color: 'var(--text2)',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 500,
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text2)')}
    >
      {children}
    </Link>
  )
}
