'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f',
      fontFamily: "'Syne', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '0 24px',
    }}>
      <div style={{ fontSize: 80, marginBottom: 8, animation: 'spin 2s ease infinite' }}>🌀</div>

      <h1 style={{
        fontSize: 96, fontWeight: 800, color: '#c8f23c',
        textShadow: '0 0 40px rgba(200,242,60,0.4)',
        lineHeight: 1, marginBottom: 8,
      }}>
        404
      </h1>

      <h2 style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 28, marginBottom: 12 }}>
        Se fudeu! 😂
      </h2>

      <p style={{ color: '#555577', fontSize: 16, marginBottom: 8 }}>
        Essa página não existe, foi deletada, ou você digitou errado.
      </p>
      <p style={{ color: '#333355', fontSize: 14, marginBottom: 40 }}>
        kkkkkkkkkkkk
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => router.push('/feed')}
          style={{
            background: '#c8f23c', color: '#000', fontWeight: 700,
            padding: '12px 28px', borderRadius: 50, border: 'none', cursor: 'pointer',
            fontSize: 15, fontFamily: "'Syne', sans-serif",
            boxShadow: '0 0 20px rgba(200,242,60,0.4)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(200,242,60,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.4)')}
        >
          Voltar pro Feed
        </button>
        <button
          onClick={() => router.back()}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: '#8888aa', padding: '12px 28px', borderRadius: 50, cursor: 'pointer',
            fontSize: 15, fontFamily: "'Syne', sans-serif", transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,242,60,0.3)'; e.currentTarget.style.color = '#c8f23c' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#8888aa' }}
        >
          Voltar
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  )
}