'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import MobileMenu from './MobileMenu'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Recursos', href: '#features' },
    { label: 'Como funciona', href: '#showcase' },
    { label: 'Preços', href: '/pricing' },
  ]

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          width: '100%',
          transition: 'all 0.25s ease',
          background: scrolled ? 'rgba(10, 10, 15, 0.78)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          borderBottom: scrolled
            ? '1px solid var(--border-2)'
            : '1px solid transparent',
        }}
      >
        <div
          className="container-vtx"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 68,
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 12px var(--green)',
              }}
            />
            VORTEX<span style={{ color: 'var(--green)' }}>.</span>
          </Link>

          <nav
            className="vtx-nav-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: 32 }}
          >
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}

            <div style={{ display: 'flex', gap: 10, marginLeft: 12 }}>
              <Link
                href="/login"
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: '1px solid var(--border-2)',
                  color: 'var(--text)',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--green)'
                  e.currentTarget.style.color = 'var(--green)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-2)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="neon-btn"
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Criar conta
              </Link>
            </div>
          </nav>

          <button
            className="vtx-nav-mobile tap-highlight"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            style={{
              display: 'none',
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-2)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--text)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path
                d="M3 6h16M3 11h16M3 16h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={[...links, { label: 'Entrar', href: '/login' }, { label: 'Criar conta', href: '/register' }]}
      />

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.vtx-nav-desktop) {
            display: none !important;
          }
          :global(.vtx-nav-mobile) {
            display: flex !important;
          }
        }
      `}</style>
    </>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        color: 'var(--text-2)',
        fontFamily: "'Syne', sans-serif",
        fontWeight: 500,
        fontSize: 14,
        textDecoration: 'none',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
    >
      {children}
    </Link>
  )
}