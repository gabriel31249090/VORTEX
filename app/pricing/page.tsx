'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Nav from '../components/Nav'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    label: null,
    color: '#8888aa',
    glowColor: 'rgba(136,136,170,0.2)',
    borderColor: 'rgba(255,255,255,0.08)',
    badge: null,
    description: 'O essencial pra começar no VORTEX.',
    features: [
      'Feed de posts e comunidades',
      'Criar e entrar em comunidades',
      'Comentários e curtidas',
      'Mensagens diretas',
      'Upload de foto de perfil e banner',
      'Notificações em tempo real',
      'Busca de usuários e comunidades',
    ],
    limits: [
      'Foto de perfil: até 2MB',
      'Vídeos: até 10MB',
      'Sem personalização de cor',
    ],
    cta: 'Plano atual',
    ctaDisabled: true,
  },
  {
    id: 'boost',
    name: 'BOOST',
    price: 10,
    label: 'Popular',
    color: '#c8f23c',
    glowColor: 'rgba(200,242,60,0.25)',
    borderColor: 'rgba(200,242,60,0.4)',
    badge: '⚡',
    description: 'Personalização, destaque e mais espaço de upload.',
    features: [
      'Tudo do plano Free',
      'Badge ⚡ verificado no perfil',
      'Cor de destaque personalizada no perfil',
      'Caracteres e emojis especiais no nome',
      'Foto de perfil: até 10MB',
      'Vídeos: até 100MB',
      'Áudio: até 50MB',
      'Destaque visual nos posts',
    ],
    limits: [],
    cta: 'Assinar BOOST',
    ctaDisabled: false,
  },
  {
    id: 'mega',
    name: 'MEGA BOOST',
    price: 15,
    label: 'Ultimate',
    color: '#a78bfa',
    glowColor: 'rgba(167,139,250,0.25)',
    borderColor: 'rgba(167,139,250,0.5)',
    badge: '👑',
    description: 'O máximo de personalização e capacidade do VORTEX.',
    features: [
      'Tudo do plano BOOST',
      'Badge 👑 exclusivo no perfil',
      'GIF na foto de perfil',
      'Vídeo ou GIF no banner',
      'Fontes e formatação especial nos posts',
      'Cor customizada nos posts',
      'Foto de perfil: até 50MB',
      'Vídeos: até 500MB',
      'Áudio: até 200MB',
      'Crop e reposicionamento de foto/banner',
      'Suporte prioritário',
    ],
    limits: [],
    cta: 'Assinar MEGA BOOST',
    ctaDisabled: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Syne', sans-serif" }}>
      <Nav />

      <main style={{
        maxWidth: 1080, margin: '0 auto',
        padding: '48px 24px 100px',
        paddingLeft: 'max(24px, calc(220px + 32px))',
      }} className="pricing-main">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(200,242,60,0.08)',
            border: '1px solid rgba(200,242,60,0.2)',
            borderRadius: 50, padding: '6px 18px', marginBottom: 20,
          }}>
            <span style={{ color: '#c8f23c', fontSize: 13, fontWeight: 700 }}>◈ Planos VORTEX</span>
          </div>
          <h1 style={{
            color: '#f0f0f8', fontWeight: 800, fontSize: 40,
            margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.2,
          }}>
            Eleve sua experiência
          </h1>
          <p style={{ color: '#8888aa', fontSize: 16, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Escolha o plano ideal e desbloqueie recursos exclusivos de personalização, upload e destaque no VORTEX.
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          alignItems: 'start',
        }} className="pricing-grid">
          {plans.map(plan => {
            const isHovered = hoveredPlan === plan.id
            const isFeatured = plan.id === 'boost'
            const isUltimate = plan.id === 'mega'

            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  background: isFeatured ? 'linear-gradient(180deg, rgba(200,242,60,0.06) 0%, #111118 100%)' :
                    isUltimate ? 'linear-gradient(180deg, rgba(167,139,250,0.06) 0%, #111118 100%)' : '#111118',
                  border: `1.5px solid ${isHovered ? plan.borderColor : plan.id === 'free' ? 'rgba(255,255,255,0.06)' : plan.borderColor}`,
                  borderRadius: 20,
                  padding: 28,
                  position: 'relative',
                  transition: 'all 0.25s',
                  boxShadow: isHovered ? `0 0 40px ${plan.glowColor}` : isFeatured ? `0 0 24px rgba(200,242,60,0.1)` : isUltimate ? `0 0 24px rgba(167,139,250,0.1)` : 'none',
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                }}
              >
                {/* Label badge */}
                {plan.label && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, color: plan.id === 'boost' ? '#000' : '#fff',
                    fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 50,
                    whiteSpace: 'nowrap', letterSpacing: '0.05em',
                    boxShadow: `0 0 12px ${plan.glowColor}`,
                  }}>
                    {plan.label}
                  </div>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {plan.badge && (
                      <span style={{ fontSize: 22 }}>{plan.badge}</span>
                    )}
                    <h2 style={{
                      color: plan.color, fontWeight: 800, fontSize: 22,
                      margin: 0, letterSpacing: '-0.5px',
                      textShadow: plan.id !== 'free' ? `0 0 20px ${plan.glowColor}` : 'none',
                    }}>
                      {plan.name}
                    </h2>
                  </div>
                  <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div style={{
                  marginBottom: 24, paddingBottom: 24,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {plan.price === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 40 }}>Grátis</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: '#555577', fontSize: 16, fontWeight: 600 }}>R$</span>
                      <span style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 48, lineHeight: 1 }}>{plan.price}</span>
                      <span style={{ color: '#555577', fontSize: 14 }}>/mês</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        color: plan.id === 'free' ? '#555577' : plan.color,
                        fontSize: 14, flexShrink: 0, marginTop: 1,
                        textShadow: plan.id !== 'free' ? `0 0 8px ${plan.glowColor}` : 'none',
                      }}>✓</span>
                      <span style={{ color: '#c8c8e0', fontSize: 13, lineHeight: 1.5 }}>{feature}</span>
                    </div>
                  ))}
                  {plan.limits.map((limit, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ color: '#333355', fontSize: 14, flexShrink: 0, marginTop: 1 }}>—</span>
                      <span style={{ color: '#555577', fontSize: 13, lineHeight: 1.5 }}>{limit}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => !plan.ctaDisabled && router.push(`/checkout?plan=${plan.id}`)}
                  disabled={plan.ctaDisabled}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 50,
                    border: plan.ctaDisabled ? '1px solid rgba(255,255,255,0.08)' :
                      plan.id === 'boost' ? 'none' : `1.5px solid ${plan.borderColor}`,
                    background: plan.ctaDisabled ? 'transparent' :
                      plan.id === 'boost' ? '#c8f23c' :
                      plan.id === 'mega' ? 'linear-gradient(135deg, #a78bfa, #7c5cbf)' : 'transparent',
                    color: plan.ctaDisabled ? '#333355' :
                      plan.id === 'boost' ? '#000' : '#f0f0f8',
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700, fontSize: 14, cursor: plan.ctaDisabled ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: plan.ctaDisabled ? 'none' :
                      plan.id === 'boost' ? '0 0 20px rgba(200,242,60,0.3)' :
                      plan.id === 'mega' ? '0 0 20px rgba(167,139,250,0.3)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!plan.ctaDisabled) {
                      if (plan.id === 'boost') e.currentTarget.style.boxShadow = '0 0 30px rgba(200,242,60,0.5)'
                      if (plan.id === 'mega') e.currentTarget.style.boxShadow = '0 0 30px rgba(167,139,250,0.5)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!plan.ctaDisabled) {
                      if (plan.id === 'boost') e.currentTarget.style.boxShadow = '0 0 20px rgba(200,242,60,0.3)'
                      if (plan.id === 'mega') e.currentTarget.style.boxShadow = '0 0 20px rgba(167,139,250,0.3)'
                    }
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ / nota */}
        <div style={{
          marginTop: 60, padding: '28px 32px',
          background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔒</span>
          <div>
            <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>
              Pagamento seguro via Stripe
            </p>
            <p style={{ color: '#8888aa', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Cancele quando quiser, sem taxas ocultas. Sua assinatura é mensal e pode ser cancelada a qualquer momento pelo painel de configurações.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @media (max-width: 767px) {
          .pricing-main { padding-left: 24px !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 768px) and (max-width: 1000px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}