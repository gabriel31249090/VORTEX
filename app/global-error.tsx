'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: '#0A0A0F',
            padding: 24,
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <span style={{ fontSize: 40 }}>⚠️</span>
          <h1 style={{ color: '#f0f0f8', fontSize: 18, fontWeight: 700, margin: 0 }}>
            O Vortex encontrou um erro inesperado.
          </h1>
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 50,
              border: 'none',
              background: '#C8F23C',
              color: '#000',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
