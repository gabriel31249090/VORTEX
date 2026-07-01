'use client'

type FeedAdProps = {
  ad: {
    id: string
    title: string
    description: string | null
    image_url: string | null
    link_url: string
  }
}

export default function FeedAd({ ad }: FeedAdProps) {
  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
        fontFamily: "'Syne', sans-serif",
        position: 'relative',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        {/* Label patrocinado */}
        <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', borderRadius: 50, padding: '2px 8px', zIndex: 1 }}>
          <span style={{ color: '#444466', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>PATROCINADO</span>
        </div>

        {/* Imagem */}
        {ad.image_url && (
          <img src={ad.image_url} alt={ad.title} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
        )}

        <div style={{ padding: '14px 18px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Ícone caso não tenha imagem */}
          {!ad.image_url && (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a1a28', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📢</div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, margin: '0 0 4px', lineHeight: 1.3 }}>{ad.title}</p>
            {ad.description && <p style={{ color: '#8888aa', fontSize: 12, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as any}>{ad.description}</p>}
          </div>

          <span style={{ color: '#555577', fontSize: 18, flexShrink: 0 }}>→</span>
        </div>
      </div>
    </a>
  )
}