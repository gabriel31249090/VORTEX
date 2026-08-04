type FeatureCardProps = {
  title: string
  desc: string
  icon: string
  accent: 'green' | 'purple'
  col: string
  row: string
}

const ACCENT_COLORS = {
  green: 'var(--green)',
  purple: '#8b5cf6',
} as const

export default function FeatureCard({
  title,
  desc,
  icon,
  accent,
  col,
  row,
}: FeatureCardProps) {
  const color = ACCENT_COLORS[accent]

  return (
    <div
      style={{
        gridColumn: col,
        gridRow: row,
        padding: 26,
        borderRadius: 20,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.008))',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, border-color 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'rgba(200,242,60,0.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* Glow no canto */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          background: `radial-gradient(circle, ${color}1f, transparent 70%)`,
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 26,
            color,
            marginBottom: 14,
            fontFamily: 'var(--mono)',
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: 19,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--text2)',
          margin: 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {desc}
      </p>
    </div>
  )
}
