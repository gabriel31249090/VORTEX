import Link from 'next/link'

export default function LandingFooter() {
  return (
    <footer
      style={{
        padding: '64px 32px 40px',
        borderTop: '1px solid var(--border)',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          marginBottom: 48,
        }}
      >
        <div style={{ gridColumn: 'span 1' }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 14,
              letterSpacing: '0.04em',
            }}
          >
            VORTEX<span style={{ color: 'var(--green)' }}>.</span>
          </div>
          <p
            style={{
              color: 'var(--text2)',
              fontSize: 13,
              lineHeight: 1.6,
              maxWidth: 260,
            }}
          >
            A rede social sem limites. Open source, sem rastreamento, sem
            algorítmo te vendendo como produto.
          </p>
        </div>

        <FooterCol
          title="Produto"
          links={[
            { label: 'Recursos', href: '#features' },
            { label: 'Preços', href: '/pricing' },
            { label: 'Comunidades', href: '/communities' },
            { label: 'Explorar', href: '/search' },
          ]}
        />
        <FooterCol
          title="Conta"
          links={[
            { label: 'Entrar', href: '/login' },
            { label: 'Criar conta', href: '/register' },
            { label: 'Configurações', href: '/settings' },
          ]}
        />
        <FooterCol
          title="Código"
          links={[
            { label: 'GitHub', href: 'https://github.com/gabriel31249090/VORTEX' },
            { label: 'Status', href: '#' },
            { label: 'Termos', href: '#' },
            { label: 'Privacidade', href: '#' },
          ]}
        />
      </div>

      <div
        style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text3)',
          fontFamily: 'var(--mono)',
          letterSpacing: '0.05em',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>© 2026 VORTEX · todos os direitos reservados</div>
        <div>feito com buracos negros e café</div>
      </div>
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
          fontSize: 11,
          color: 'var(--green)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: 18,
          fontFamily: 'var(--mono)',
          fontWeight: 600,
        }}
      >
        {title}
      </h4>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {links.map((link, i) => (
          <li key={i}>
            <Link
              href={link.href}
              style={{
                color: 'var(--text2)',
                textDecoration: 'none',
                fontSize: 13,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text2)')}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
