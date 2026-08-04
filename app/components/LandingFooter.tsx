import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer
      style={{
        marginTop: 80,
        borderTop: '1px solid var(--border)',
        padding: 'clamp(48px, 8vw, 80px) 0 32px',
        background: 'rgba(7, 7, 11, 0.5)',
      }}
    >
      <div className="container-vtx">
        <div
          className="vtx-footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 56,
          }}
        >
          {/* Brand col */}
          <div>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: 'var(--text)',
                textDecoration: 'none',
                marginBottom: 16,
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
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-2)',
                lineHeight: 1.55,
                maxWidth: 360,
                marginBottom: 24,
              }}
            >
              A rede social sem limites. Open source, sem rastreamento, sem
              algorítmo te vendendo como produto.
            </p>
            <a
              href="https://github.com/gabriel31249090/VORTEX"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-2)',
                color: 'var(--text-2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--green)'
                e.currentTarget.style.color = 'var(--green)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-2)'
                e.currentTarget.style.color = 'var(--text-2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              github.com/gabriel31249090/VORTEX
            </a>
          </div>

          <FooterCol
            title="Produto"
            links={[
              { label: 'Recursos', href: '/#features' },
              { label: 'Preços', href: '/pricing' },
              { label: 'Comunidades', href: '/communities' },
              { label: 'Buscar', href: '/search' },
            ]}
          />
          <FooterCol
            title="Conta"
            links={[
              { label: 'Entrar', href: '/login' },
              { label: 'Criar conta', href: '/register' },
              { label: 'Configurações', href: '/settings' },
              { label: 'Salvos', href: '/saved' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: 'Termos', href: '/terms' },
              { label: 'Privacidade', href: '/privacy' },
              { label: 'Contato', href: 'mailto:contato@vortex.app' },
              { label: 'Status', href: '#' },
            ]}
          />
        </div>

        <div className="divider" style={{ marginBottom: 24 }} />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            color: 'var(--text-3)',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>© 2026 VORTEX · todos os direitos reservados</span>
          <span>feito com buracos negros e café</span>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.vtx-footer-grid) {
            grid-template-columns: 1fr 1fr !important;
            gap: 32px !important;
          }
        }
        @media (max-width: 480px) {
          :global(.vtx-footer-grid) {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
        }
      `}</style>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h4
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 18,
        }}
      >
        {title}
      </h4>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              style={{
                color: 'var(--text-2)',
                fontSize: 14,
                textDecoration: 'none',
                fontFamily: "'Inter', sans-serif",
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-2)')}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
