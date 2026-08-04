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
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '140px 32px 100px',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(200,242,60,0.07), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.05), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <BlackHoleBackground intensity={0.55} particleCount={6000} />

      {/* Subtle grain overlay — mata o look "render limpo de IA" */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: 0.04,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 760,
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(200,242,60,0.08)',
            border: '1px solid rgba(200,242,60,0.3)',
            marginBottom: 28,
            fontSize: 11,
            fontFamily: 'var(--mono)',
            color: 'var(--green)',
            letterSpacing: '0.05em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--green)',
              boxShadow: '0 0 10px var(--green)',
              animation: 'neonPulse 2s ease infinite',
            }}
          />
          v2.0 · agora com stories, comunidades e DMs
        </div>

        <h1
          style={{
            fontFamily: 'var(--font)',
            fontSize: 'clamp(52px, 8.5vw, 104px)',
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: '-0.035em',
            margin: 0,
            color: 'var(--text)',
          }}
        >
          A rede social<br />
          <span
            style={{
              color: 'var(--green)',
              textShadow: '0 0 50px rgba(200,242,60,0.45)',
            }}
          >
            sem limites.
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: 'var(--text2)',
            maxWidth: 580,
            marginTop: 28,
          }}
        >
          VORTEX junta o melhor do Reddit e do Instagram num só lugar.
          Comunidades por interesse, feed visual, stories que somem em 24h,
          DMs sem algorítmo — e nenhum rastreamento te vendendo como produto.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 40,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/register"
            className="neon-btn"
            style={{
              padding: '15px 30px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
          >
            Criar conta grátis →
          </Link>
          <Link
            href="/feed"
            style={{
              padding: '15px 30px',
              borderRadius: 12,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text)',
              border: '1px solid var(--border2)',
              background: 'rgba(255,255,255,0.02)',
              display: 'inline-block',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(200,242,60,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
              e.currentTarget.style.borderColor = 'var(--border2)'
            }}
          >
            Ir para o feed
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 56,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text2)',
            flexWrap: 'wrap',
          }}
        >
          <Stat n="12k+" l="usuários ativos" />
          <Stat n="340" l="comunidades" />
          <Stat n="98%" l="zero ads invasivos" />
        </div>
      </div>
    </section>
  )
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--text)',
          fontFamily: 'var(--font)',
        }}
      >
        {n}
      </div>
      <div style={{ marginTop: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{l}</div>
    </div>
  )
}
