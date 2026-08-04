import Link from 'next/link'

export default function LandingCTA() {
  return (
    <section
      style={{
        padding: '100px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 72px) 32px',
          borderRadius: 32,
          background:
            'radial-gradient(circle at 50% 30%, rgba(200,242,60,0.1), transparent 60%), rgba(255,255,255,0.02)',
          border: '1px solid rgba(200,242,60,0.18)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            background:
              'radial-gradient(circle, rgba(200,242,60,0.12) 0%, transparent 60%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--green)',
              letterSpacing: '0.25em',
              marginBottom: 20,
            }}
          >
            BORA?
          </div>
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Pronto pra entrar<br />no vórtice?
          </h2>
          <p
            style={{
              color: 'var(--text2)',
              marginTop: 18,
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 460,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Cria em 30 segundos, sem cartão, sem algorítmo te vigiando.
            Open source no GitHub.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 32,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/register"
              className="neon-btn"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Criar conta grátis →
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                borderRadius: 12,
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--text)',
                border: '1px solid var(--border2)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
