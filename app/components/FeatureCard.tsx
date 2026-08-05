import type { CSSProperties } from 'react'

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
      className="vtx-feature-card feature-card"
      style={{
        gridColumn: col,
        gridRow: row,
        '--accent-color': color,
      } as React.CSSProperties}
    >
      {/* Glow no canto */}
      <div aria-hidden className="feature-card-glow" />

      <div className="feature-card-body">
        <div className="feature-card-icon">{icon}</div>
        <h3 className="feature-card-title">{title}</h3>
      </div>
      <p className="feature-card-desc">{desc}</p>
    </div>
  )
}