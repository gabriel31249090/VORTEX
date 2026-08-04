/**
 * BackgroundGradient — fundo visual leve, zero JS, zero Canvas.
 *
 * Substitui o BlackHoleBackground no feed e em páginas internas.
 * Mantém o DNA do VORTEX (verde + roxo em camadas radiais) sem
 * queimar GPU.
 *
 * Vantagens vs BlackHoleBackground:
 *  - 0 kb de JS extra (só CSS)
 *  - 0 WebGL (não bloqueia em devices que desativaram)
 *  - Funciona com prefers-reduced-motion
 *  - Scroll-friendly (não repinta)
 *
 * Uso:
 *   <BackgroundGradient variant="feed" />
 *   <BackgroundGradient variant="profile" />
 *   <BackgroundGradient variant="messages" />
 */

type BackgroundGradientProps = {
  variant?: 'feed' | 'profile' | 'messages' | 'community' | 'subtle'
  className?: string
}

const VARIANTS = {
  // Feed: aurora sutil, com um toque de movimento
  feed: {
    background: `
      radial-gradient(ellipse 60% 40% at 15% 20%, rgba(200, 242, 60, 0.08), transparent 60%),
      radial-gradient(ellipse 50% 50% at 85% 80%, rgba(139, 92, 246, 0.10), transparent 60%),
      radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02), transparent 60%)
    `,
    animation: 'drift 18s ease-in-out infinite',
  },
  // Profile: foco no avatar, com glow lateral
  profile: {
    background: `
      radial-gradient(ellipse 50% 40% at 80% 0%, rgba(139, 92, 246, 0.10), transparent 60%),
      radial-gradient(ellipse 40% 30% at 0% 100%, rgba(200, 242, 60, 0.06), transparent 60%)
    `,
    animation: 'none',
  },
  // Messages/DMs: caloroso, mais intimista
  messages: {
    background: `
      radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139, 92, 246, 0.07), transparent 60%),
      radial-gradient(ellipse 60% 40% at 50% 100%, rgba(200, 242, 60, 0.04), transparent 60%)
    `,
    animation: 'none',
  },
  // Community: clean
  community: {
    background: `
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(200, 242, 60, 0.05), transparent 60%),
      radial-gradient(ellipse 40% 60% at 100% 100%, rgba(139, 92, 246, 0.06), transparent 60%)
    `,
    animation: 'none',
  },
  // Mínimo: só vignette
  subtle: {
    background: `
      radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.3) 100%)
    `,
    animation: 'none',
  },
} as const

export default function BackgroundGradient({
  variant = 'feed',
  className = '',
}: BackgroundGradientProps) {
  const v = VARIANTS[variant]

  return (
    <div
      aria-hidden="true"
      className={`vtx-bg-gradient ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: v.background,
        animation: v.animation,
        willChange: v.animation === 'none' ? 'auto' : 'transform',
      }}
    />
  )
}
