'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const BlackHoleBackground = dynamic(
  () => import('./BlackHoleBackground'),
  { ssr: false }
)

export default function LandingHero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: 'min(720px, 90vh)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        paddingTop: 40,
        paddingBottom: 60,
      }}
    >
      <BlackHoleBackground intensity={0.55} />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, transparent 30%, rgba(10,10,15,0.7) 80%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container-vtx"
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 560px) 1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid var(--border-2)',
              background: 'rgba(10,10,15,0.5)',
              backdropFilter: 'blur(8px)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--green)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 8px var(--green)',
                animation: 'neonPulse 2s ease infinite',
              }}
            />
            v2.0 · stories, comunidades e DMs
          </div>

          <h1
            style={{
              fontSize: 'clamp(44px, 8vw, 96px)',
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: '-0.035em',
              color: 'var(--text)',
              marginBottom: 24,
              textWrap: 'balance',
            }}
          >
            A rede social<br />
            <span style={{ color: 'var(--green)', textShadow: '0 0 30px rgba(200,242,60,0.3)' }}>
              sem limites.
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: 'var(--text-2)',
              lineHeight: 1.55,
              maxWidth: 540,
              marginBottom: 32,
              textWrap: 'pretty',
            }}
          >
            VORTEX junta o melhor do Reddit e do Instagram num só lugar.
            Comunidades por interesse, feed visual, stories que somem em 24h,
            DMs sem algorítmo — e nenhum rastreamento te vendendo como produto.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 48,
            }}
          >
            <Link
              href="/register"
              className="neon-btn"
              style={{
                padding: '14px 24px',
                borderRadius: 12,
                fontSize: 15,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Criar conta grátis <span>→</span>
            </Link>
            <Link
              href="/feed"
              style={{
                padding: '14px 24px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-2)',
                color: 'var(--text)',
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(200, 242, 60, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'var(--border-2)'
              }}
            >
              Ir para o feed
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 'clamp(24px, 5vw, 48px)',
              flexWrap: 'wrap',
            }}
          >
            <Stat n="12k+" l="usuários" />
            <Stat n="47k" l="posts" />
            <Stat n="98%" l="uptime" />
            <Stat n="0" l="ads invasivos" />
          </div>
        </div>

        <div aria-hidden="true" className="vtx-hero-spacer" />
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.vtx-hero-spacer) {
            display: none;
          }
          :global(.vtx-hero-grid) {
            grid-template-columns: 1fr !important;
            text-align: left;
          }
        }
      `}</style>
    </section>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 800,
          color: 'var(--green)',
          fontFamily: "'Syne', sans-serif",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {l}
      </div>
    </div>
  )
}