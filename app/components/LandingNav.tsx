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
      <header className={`landing-nav ${scrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav-inner container-vtx">
          <Link href="/" className="landing-brand">
            <span className="landing-brand-dot" />
            VORTEX<span className="landing-brand-accent">.</span>
          </Link>

          <nav className="landing-nav-desktop">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}

            <div className="landing-nav-actions">
              <Link href="/login" className="landing-nav-login">
                Entrar
              </Link>
              <Link href="/register" className="neon-btn landing-nav-register">
                Criar conta
              </Link>
            </div>
          </nav>

          <button
            className="landing-nav-mobile tap-highlight"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
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
    </>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="landing-nav-link">
      {children}
    </Link>
  )
}