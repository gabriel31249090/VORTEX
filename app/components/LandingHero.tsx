'use client'

import Link from 'next/link'
import BlackHoleBackground from './BlackHoleBackground'

export default function LandingHero() {
  return (
    <section className="landing-hero">
      <BlackHoleBackground intensity={0.55} />

      <div aria-hidden="true" className="landing-hero-overlay" />

      <div className="container-vtx vtx-hero-grid landing-hero-inner">
        <div className="landing-hero-copy">
          <div className="landing-hero-pill">
            <span className="landing-hero-pill-dot" />
            v2.0 · stories, comunidades e DMs
          </div>

          <h1 className="landing-hero-title">
            VORTEX é uma rede social<br />
            <span className="landing-hero-title-accent">
              open source e centrada em privacidade.
            </span>
          </h1>

          <p className="landing-hero-copytext">
            Uma plataforma para comunidades, stories e mensagens em ordem cronológica.
            Cada comunidade tem seu próprio feed e os stories expiram em 24h.
            DMs não são impulsionadas por recomendações algorítmicas.
          </p>

          <div className="landing-hero-actions">
            <Link href="/register" className="neon-btn landing-hero-cta">
              Criar conta grátis <span>→</span>
            </Link>
            <Link href="/feed" className="landing-hero-cta landing-hero-cta-secondary">
              Ir para o feed
            </Link>
          </div>
        </div>

        <aside aria-hidden="true" className="landing-hero-visual">
          <div className="landing-hero-visual-card surface glass">
            <span className="landing-hero-visual-pill">Preview do feed</span>
            <h2 className="landing-hero-visual-title">Feed cronológico com foco em contexto.</h2>
            <p className="landing-hero-visual-copy">
              Mostra comunidades, stories e mensagens sem impulsionar conteúdo por algoritmos de recomendação.
            </p>
            <div className="landing-hero-visual-meta">
              <span>Comunidades</span>
              <span>Stories 24h</span>
              <span>Mensagens cronológicas</span>
            </div>
          </div>
          <div className="landing-hero-visual-badge">
            Open source • Privacidade em foco
          </div>
        </aside>
      </div>
    </section>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="landing-hero-stat-value">{n}</div>
      <div className="landing-hero-stat-label">{l}</div>
    </div>
  )
}