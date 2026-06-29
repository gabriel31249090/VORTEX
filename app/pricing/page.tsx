'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Nav from '../components/Nav'
import { createClient } from '@/lib/supabase'

const PIX_KEY = '5565996688341'
const PIX_QR = 'iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAABgUlEQVR4nO2awW3DMAxFHysDPTpABsgo8mZFR+oG1ijZQD4GsPF7sNwm6aG9xE4t8mTJD9AHQdMkIRO/W3r5AwROOeWUU049O2XFGkjWAMOy022qqwoqSpIyQHsxIEiSdEutr6sKalhiPJ4brAPmz2BrXVVR6TSifs0Tnbo269Y+sUpqSSutgAEsZgQDXDddz6p+F1QyM7MDwNBgHdNc5myta9fUHPffMa50COg26p9X/R4o65iMZA32pouZHSb7Sa2va98Ucx3fA0SNZa9vS7FT3j6r+v9NFe8qBxFzkKSR0mUtDZb7/jEU1+1rK6knfC1Hj/vHU8XjQwO0F5vTTT+8yrpNde2bKvV9XEqbUt/PT8ftdNVA3eQcSr4n5iDPOY+miu/j3Q83L3kouu8fTi1zTL2fRkqHy+R97ZqUvZ0bn2OuQzV3a6XTxQRhJObjaFvpqoG6n2POs7SoyYgfk2krXTVQxfdpDvCA0WZIhyyDMG6mqwbK/G6UU0455VQV1CdQfchZA3/ZoAAAAABJRU5ErkJggg=='

type PlanId = 'free' | 'boost' | 'mega'

const plans = [
  {
    id: 'free' as PlanId,
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
  },
  {
    id: 'boost' as PlanId,
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
  },
  {
    id: 'mega' as PlanId,
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
  },
]

const planOrder: PlanId[] = ['free', 'boost', 'mega']

function getCtaLabel(planId: PlanId, currentPlan: PlanId, pendingPlan: PlanId | null): string {
  if (pendingPlan === planId) return '⏳ Aguardando aprovação'
  if (currentPlan === planId) return '✓ Plano atual'
  if (planId === 'free') {
    if (currentPlan !== 'free') return 'Fazer downgrade'
    return '✓ Plano atual'
  }
  const currentIdx = planOrder.indexOf(currentPlan)
  const targetIdx = planOrder.indexOf(planId)
  if (targetIdx > currentIdx) return `Assinar por R$${plans.find(p => p.id === planId)?.price}/mês`
  return `Fazer downgrade para R$${plans.find(p => p.id === planId)?.price}/mês`
}

function isCtaDisabled(planId: PlanId, currentPlan: PlanId, pendingPlan: PlanId | null): boolean {
  if (pendingPlan !== null) return true
  if (currentPlan === planId) return true
  if (planId === 'free' && currentPlan !== 'free') return true // downgrade desabilitado por ora
  return false
}

export default function PricingPage() {
  const router = useRouter()
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [payingPlan, setPayingPlan] = useState<typeof plans[0] | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free')
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Upload state
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()

      if (profile) setCurrentPlan(profile.plan as PlanId)

      // Verificar se tem pedido pendente
      const { data: pending } = await supabase
        .from('plan_requests')
        .select('plan')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (pending) setPendingPlan(pending.plan as PlanId)
      setLoadingProfile(false)
    }
    loadProfile()
  }, [router])

  function handleCopy() {
    navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo 10MB.')
      return
    }
    setReceipt(file)
    setUploadError(null)
    setUploadSuccess(false)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview(null)
    }
  }

  function handleOpenModal(plan: typeof plans[0]) {
    setPayingPlan(plan)
    setReceipt(null)
    setReceiptPreview(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

  function handleCloseModal() {
    setPayingPlan(null)
    setReceipt(null)
    setReceiptPreview(null)
    setUploadError(null)
    setUploadSuccess(false)
  }

  async function handleSubmitReceipt() {
    if (!receipt || !payingPlan || !userId) return
    setUploading(true)
    setUploadError(null)

    try {
      const supabase = createClient()
      const ext = receipt.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from('receipts')
        .upload(path, receipt, { upsert: false })

      if (storageError) throw new Error('Erro ao enviar comprovante: ' + storageError.message)

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const receiptUrl = urlData?.publicUrl ?? path

      const { error: dbError } = await supabase
        .from('plan_requests')
        .insert({
          user_id: userId,
          plan: payingPlan.id,
          receipt_url: receiptUrl,
          status: 'pending',
        })

      if (dbError) throw new Error('Erro ao registrar pedido: ' + dbError.message)

      setPendingPlan(payingPlan.id)
      setUploadSuccess(true)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setUploading(false)
    }
  }

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

          {/* Plano atual badge */}
          {!loadingProfile && (
            <div style={{ marginTop: 20 }}>
              <span style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 50, padding: '5px 16px',
                color: '#8888aa', fontSize: 13, fontWeight: 600,
              }}>
                Seu plano atual:{' '}
                <span style={{
                  color: currentPlan === 'mega' ? '#a78bfa' : currentPlan === 'boost' ? '#c8f23c' : '#8888aa',
                  fontWeight: 800,
                }}>
                  {currentPlan === 'mega' ? '👑 MEGA BOOST' : currentPlan === 'boost' ? '⚡ BOOST' : 'Free'}
                </span>
                {pendingPlan && (
                  <span style={{ color: '#f0a500', marginLeft: 10 }}>
                    · ⏳ Upgrade pendente
                  </span>
                )}
              </span>
            </div>
          )}
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
            const isCurrentPlan = currentPlan === plan.id
            const ctaLabel = loadingProfile ? '...' : getCtaLabel(plan.id, currentPlan, pendingPlan)
            const ctaDisabled = loadingProfile || isCtaDisabled(plan.id, currentPlan, pendingPlan)

            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  background: isCurrentPlan
                    ? `linear-gradient(180deg, ${plan.glowColor} 0%, #111118 100%)`
                    : isFeatured
                    ? 'linear-gradient(180deg, rgba(200,242,60,0.06) 0%, #111118 100%)'
                    : isUltimate
                    ? 'linear-gradient(180deg, rgba(167,139,250,0.06) 0%, #111118 100%)'
                    : '#111118',
                  border: `1.5px solid ${isCurrentPlan ? plan.borderColor : isHovered ? plan.borderColor : plan.id === 'free' ? 'rgba(255,255,255,0.06)' : plan.borderColor}`,
                  borderRadius: 20, padding: 28, position: 'relative',
                  transition: 'all 0.25s',
                  boxShadow: isCurrentPlan
                    ? `0 0 32px ${plan.glowColor}`
                    : isHovered
                    ? `0 0 40px ${plan.glowColor}`
                    : isFeatured ? `0 0 24px rgba(200,242,60,0.1)`
                    : isUltimate ? `0 0 24px rgba(167,139,250,0.1)` : 'none',
                  transform: isHovered && !isCurrentPlan ? 'translateY(-4px)' : 'none',
                }}
              >
                {/* Badge de plano atual */}
                {isCurrentPlan && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: plan.color, color: plan.id === 'boost' ? '#000' : '#fff',
                    fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 50,
                    whiteSpace: 'nowrap', letterSpacing: '0.05em',
                    boxShadow: `0 0 12px ${plan.glowColor}`,
                  }}>
                    ✓ Plano atual
                  </div>
                )}

                {/* Badge Popular/Ultimate (só quando não é plano atual) */}
                {plan.label && !isCurrentPlan && (
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

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {plan.badge && <span style={{ fontSize: 22 }}>{plan.badge}</span>}
                    <h2 style={{
                      color: plan.color, fontWeight: 800, fontSize: 22, margin: 0,
                      textShadow: plan.id !== 'free' ? `0 0 20px ${plan.glowColor}` : 'none',
                    }}>{plan.name}</h2>
                  </div>
                  <p style={{ color: '#8888aa', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{plan.description}</p>
                </div>

                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {plan.price === 0 ? (
                    <span style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 40 }}>Grátis</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ color: '#555577', fontSize: 16, fontWeight: 600 }}>R$</span>
                      <span style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 48, lineHeight: 1 }}>{plan.price}</span>
                      <span style={{ color: '#555577', fontSize: 14 }}>/mês</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ color: plan.id === 'free' ? '#555577' : plan.color, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ color: '#c8c8e0', fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                  {plan.limits.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ color: '#333355', fontSize: 14, flexShrink: 0, marginTop: 1 }}>—</span>
                      <span style={{ color: '#555577', fontSize: 13, lineHeight: 1.5 }}>{l}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => !ctaDisabled && plan.id !== 'free' && handleOpenModal(plan)}
                  disabled={ctaDisabled}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 50,
                    border: ctaDisabled ? '1px solid rgba(255,255,255,0.08)'
                      : plan.id === 'boost' ? 'none'
                      : `1.5px solid ${plan.borderColor}`,
                    background: ctaDisabled ? 'transparent'
                      : plan.id === 'boost' ? '#c8f23c'
                      : plan.id === 'mega' ? 'linear-gradient(135deg, #a78bfa, #7c5cbf)'
                      : 'transparent',
                    color: ctaDisabled ? '#333355' : plan.id === 'boost' ? '#000' : '#f0f0f8',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: ctaDisabled ? 'default' : 'pointer', transition: 'all 0.2s',
                    boxShadow: ctaDisabled ? 'none'
                      : plan.id === 'boost' ? '0 0 20px rgba(200,242,60,0.3)'
                      : plan.id === 'mega' ? '0 0 20px rgba(167,139,250,0.3)' : 'none',
                  }}
                >
                  {ctaLabel}
                </button>
              </div>
            )
          })}
        </div>

        {/* Nota Pix */}
        <div style={{
          marginTop: 60, padding: '28px 32px',
          background: '#111118', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>🔑</span>
          <div>
            <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>
              Pagamento via Pix
            </p>
            <p style={{ color: '#8888aa', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Após o pagamento, envie o comprovante direto no modal de assinatura. Seu plano será ativado em até 24 horas.
            </p>
          </div>
        </div>
      </main>

      {/* MODAL PIX */}
      {payingPlan && (
        <>
          <div
            onClick={handleCloseModal}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              zIndex: 200, backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#111118',
            border: `1.5px solid ${payingPlan.borderColor}`,
            borderRadius: 24, padding: '32px 28px',
            width: '90%', maxWidth: 420, zIndex: 201,
            fontFamily: "'Syne', sans-serif",
            animation: 'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: `0 0 60px ${payingPlan.glowColor}`,
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ color: '#555577', fontSize: 12, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Assinatura
                </p>
                <h2 style={{ color: payingPlan.color, fontWeight: 800, fontSize: 20, margin: 0 }}>
                  {payingPlan.badge} {payingPlan.name}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa',
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {uploadSuccess ? (
              /* Tela de sucesso */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h3 style={{ color: '#c8f23c', fontWeight: 800, fontSize: 20, margin: '0 0 12px' }}>
                  Comprovante enviado!
                </h3>
                <p style={{ color: '#8888aa', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
                  Recebemos seu comprovante. Seu plano <span style={{ color: payingPlan.color, fontWeight: 700 }}>{payingPlan.name}</span> será ativado em até <span style={{ color: '#c8f23c', fontWeight: 700 }}>24 horas</span>.
                </p>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: '#c8f23c', color: '#000', border: 'none',
                    borderRadius: 50, padding: '12px 32px',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {/* Valor */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ color: '#8888aa', fontSize: 13 }}>Valor mensal</span>
                  <span style={{ color: '#f0f0f8', fontWeight: 800, fontSize: 22 }}>R$ {payingPlan.price},00</span>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <p style={{ color: '#8888aa', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
                    ESCANEIE O QR CODE
                  </p>
                  <div style={{
                    display: 'inline-block',
                    background: '#fff', borderRadius: 16, padding: 12,
                    boxShadow: `0 0 24px ${payingPlan.glowColor}`,
                  }}>
                    <img
                      src={`data:image/png;base64,${PIX_QR}`}
                      alt="QR Code Pix"
                      style={{ width: 160, height: 160, display: 'block' }}
                    />
                  </div>
                </div>

                {/* Chave Pix */}
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    OU COPIE A CHAVE PIX
                  </p>
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <span style={{ color: '#f0f0f8', fontSize: 14, flex: 1, fontWeight: 600, letterSpacing: '0.05em' }}>
                      {PIX_KEY}
                    </span>
                    <button
                      onClick={handleCopy}
                      style={{
                        background: copied ? 'rgba(200,242,60,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${copied ? 'rgba(200,242,60,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        color: copied ? '#c8f23c' : '#8888aa',
                        borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                        fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700,
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                      }}
                    >
                      {copied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
                }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ color: '#555577', fontSize: 12, fontWeight: 600 }}>APÓS O PAGAMENTO</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Upload comprovante */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: '#8888aa', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                    ENVIE SEU COMPROVANTE
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {!receipt ? (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '100%', padding: '18px 0',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1.5px dashed rgba(255,255,255,0.12)',
                        borderRadius: 12, cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = payingPlan.borderColor)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                    >
                      <span style={{ fontSize: 24 }}>📎</span>
                      <span style={{ color: '#8888aa', fontSize: 13, fontFamily: "'Syne', sans-serif" }}>
                        Clique para anexar comprovante
                      </span>
                      <span style={{ color: '#444466', fontSize: 11, fontFamily: "'Syne', sans-serif" }}>
                        Imagem ou PDF · máx. 10MB
                      </span>
                    </button>
                  ) : (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${payingPlan.borderColor}`,
                      borderRadius: 12, padding: 14,
                    }}>
                      {receiptPreview && (
                        <img
                          src={receiptPreview}
                          alt="Preview"
                          style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                        />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{receipt.type.startsWith('image/') ? '🖼️' : '📄'}</span>
                          <span style={{ color: '#c8c8e0', fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {receipt.name}
                          </span>
                        </div>
                        <button
                          onClick={() => { setReceipt(null); setReceiptPreview(null) }}
                          style={{
                            background: 'none', border: 'none', color: '#555577',
                            cursor: 'pointer', fontSize: 13, fontFamily: "'Syne', sans-serif",
                          }}
                        >
                          Trocar
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <p style={{ color: '#ff4466', fontSize: 12, marginTop: 8 }}>{uploadError}</p>
                  )}
                </div>

                {/* Botão enviar */}
                <button
                  onClick={handleSubmitReceipt}
                  disabled={!receipt || uploading}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 50,
                    border: 'none',
                    background: !receipt || uploading
                      ? 'rgba(255,255,255,0.05)'
                      : payingPlan.id === 'boost' ? '#c8f23c'
                      : 'linear-gradient(135deg, #a78bfa, #7c5cbf)',
                    color: !receipt || uploading ? '#444466'
                      : payingPlan.id === 'boost' ? '#000' : '#fff',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: !receipt || uploading ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: receipt && !uploading
                      ? payingPlan.id === 'boost' ? '0 0 20px rgba(200,242,60,0.3)'
                      : '0 0 20px rgba(167,139,250,0.3)' : 'none',
                  }}
                >
                  {uploading ? '⏳ Enviando...' : 'Enviar comprovante'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: translate(-50%,-48%) scale(0.96); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
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