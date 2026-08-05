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
            A rede social<br />
            <span className="landing-hero-title-accent">
              sem limites.
            </span>
          </h1>

          <p className="landing-hero-copytext">
            VORTEX junta o melhor do Reddit e do Instagram num só lugar.
            Comunidades por interesse, feed visual, stories que somem em 24h,
            DMs sem algorítmo — e nenhum rastreamento te vendendo como produto.
          </p>

          <div className="landing-hero-actions">
            <Link href="/register" className="neon-btn landing-hero-cta">
              Criar conta grátis <span>→</span>
            </Link>
            <Link href="/feed" className="landing-hero-cta landing-hero-cta-secondary">
              Ir para o feed
            </Link>
          </div>

          <div className="landing-hero-stats">
            <Stat n="12k+" l="usuários" />
            <Stat n="47k" l="posts" />
            <Stat n="98%" l="uptime" />
            <Stat n="0" l="ads invasivos" />
          </div>
        </div>

        <aside aria-hidden="true" className="landing-hero-visual">
          <div className="landing-hero-visual-card surface glass">
            <span className="landing-hero-visual-pill">Preview do feed</span>
            <h2 className="landing-hero-visual-title">Cronológico, leve e focado em você.</h2>
            <p className="landing-hero-visual-copy">
              Visual clean com comunidades, stories ativos e mensagens diretas sem algoritmos invasivos.
            </p>
            <div className="landing-hero-visual-meta">
              <span>Comunidades reais</span>
              <span>Stories 24h</span>
              <span>DMs sem ruído</span>
            </div>
          </div>
          <div className="landing-hero-visual-badge">
            Sem anúncios invasivos • Sem rastreamento
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