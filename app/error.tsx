'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
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
      }}
    >
      <span style={{ fontSize: 40 }}>⚠️</span>
      <h1 style={{ color: '#f0f0f8', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'Syne', sans-serif" }}>
        Ops, algo deu errado.
      </h1>
      <p style={{ color: '#8888aa', fontSize: 14, margin: 0, maxWidth: 380 }}>
        Tivemos um problema ao carregar essa página. Você pode tentar de novo.
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 50,
          border: 'none',
          background: '#C8F23C',
          color: '#000',
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          boxShadow: '0 0 16px rgba(200,242,60,0.3)',
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
