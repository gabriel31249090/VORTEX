import { ImageResponse } from 'next/og'

export const alt = 'VORTEX — sua rede, no seu ritmo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: '#0a0a0f',
          color: '#f0f0f8',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ color: '#c8f23c', fontSize: 28, letterSpacing: 8, fontWeight: 800 }}>
          VORTEX
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 28, lineHeight: 1.05 }}>
          Sua internet. Seu ritmo.
        </div>
        <div style={{ color: '#8888aa', fontSize: 30, marginTop: 28 }}>
          Comunidades · stories · mensagens · feed cronológico
        </div>
        <div
          style={{
            marginTop: 52,
            width: 280,
            height: 8,
            borderRadius: 999,
            background: '#c8f23c',
            boxShadow: '0 0 40px rgba(200,242,60,.6)',
          }}
        />
      </div>
    ),
    size
  )
}
