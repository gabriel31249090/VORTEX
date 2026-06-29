'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Nav from '../components/Nav'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

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

export default function PricingPage() {
  const router = useRouter()
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [payingPlan, setPayingPlan] = useState<typeof plans[0] | null>(null)
  const [copied, setCopied] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free')
  const [userId, setUserId] = useState<string | null>(null)
  const [pendingRequest, setPendingRequest] = useState<PlanId | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()

      if (profile) setCurrentPlan(profile.plan as PlanId)

      // Verifica se tem pedido pendente
      const { data: requests } = await supabase
        .from('plan_requests')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)

      if (requests && requests.length > 0) {
        setPendingRequest(requests[0].plan as PlanId)
      }
    }
    loadProfile()
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(PIX_KEY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getCtaLabel(plan: typeof plans[0]) {
    if (plan.id === 'free') {
      return currentPlan === 'free' ? 'Plano atual' : 'Fazer downgrade'
    }
    if (plan.id === currentPlan) return 'Plano atual'
    if (pendingRequest === plan.id) return '⏳ Aguardando aprovação'
    if (plan.id === 'boost' && currentPlan === 'mega') return 'Fazer downgrade'
    return `Assinar por R$${plan.price}/mês`
  }

  function isCtaDisabled(plan: typeof plans[0]) {
    if (plan.id === currentPlan) return true
    if (pendingRequest === plan.id) return true
    if (plan.id === 'free') return currentPlan === 'free'
    return false
  }

  async function handleSubmitReceipt() {
    if (!receipt || !payingPlan || !userId) return
    setUploading(true)

    try {
      const supabase = createClient()

      // Upload do comprovante
      const ext = receipt.name.split('.').pop()
      const filePath = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receipt, { upsert: false })

      if (uploadError) throw uploadError

      // Pega a URL do arquivo
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      // Salva o pedido
      const { error: insertError } = await supabase
        .from('plan_requests')
        .insert({
          user_id: userId,
          plan: payingPlan.id,
          receipt_url: urlData.publicUrl,
          status: 'pending',
        })

      if (insertError) throw insertError

      setPendingRequest(payingPlan.id as PlanId)
      setPayingPlan(null)
      setReceipt(null)
      toast.success('Comprovante enviado! Seu plano será ativado em até 24h.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar comprovante. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const planOrder: PlanId[] = ['free', 'boost', 'mega']

  function isUpgrade(planId: PlanId) {
    return planOrder.indexOf(planId) > planOrder.indexOf(currentPlan)
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

          {/* Banner plano atual */}
          {currentPlan !== 'free' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              marginTop: 24, background: 'rgba(200,242,60,0.06)',
              border: '1px solid rgba(200,242,60,0.2)',
              borderRadius: 50, padding: '8px 20px',
            }}>
              <span style={{ fontSize: 16 }}>
                {plans.find(p => p.id === currentPlan)?.badge}
              </span>
              <span style={{ color: '#c8f23c', fontSize: 13, fontWeight: 700 }}>
                Você está no plano {plans.find(p => p.id === currentPlan)?.name}
              </span>
            </div>
          )}

          {pendingRequest && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              marginTop: 12, background: 'rgba(255,200,0,0.06)',
              border: '1px solid rgba(255,200,0,0.2)',
              borderRadius: 50, padding: '8px 20px',
            }}>
              <span style={{ color: '#ffc800', fontSize: 13, fontWeight: 700 }}>
                ⏳ Comprovante enviado para {plans.find(p => p.id === pendingRequest)?.name} — aguardando aprovação
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
            const isCurrent = plan.id === currentPlan
            const disabled = isCtaDisabled(plan)
            const ctaLabel = getCtaLabel(plan)
            const upgrade = isUpgrade(plan.id as PlanId)

            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  background: isCurrent
                    ? `linear-gradient(180deg, ${plan.glowColor} 0%, #111118 100%)`
                    : isFeatured
                    ? 'linear-gradient(180deg, rgba(200,242,60,0.06) 0%, #111118 100%)'
                    : isUltimate
                    ? 'linear-gradient(180deg, rgba(167,139,250,0.06) 0%, #111118 100%)'
                    : '#111118',
                  border: `1.5px solid ${isCurrent ? plan.color : isHovered ? plan.borderColor : plan.id === 'free' ? 'rgba(255,255,255,0.06)' : plan.borderColor}`,
                  borderRadius: 20, padding: 28, position: 'relative',
                  transition: 'all 0.25s',
                  boxShadow: isCurrent
                    ? `0 0 32px ${plan.glowColor}`
                    : isHovered
                    ? `0 0 40px ${plan.glowColor}`
                    : isFeatured ? `0 0 24px rgba(200,242,60,0.1)`
                    : isUltimate ? `0 0 24px rgba(167,139,250,0.1)` : 'none',
                  transform: isHovered && !isCurrent ? 'translateY(-4px)' : 'none',
                }}
              >
                {/* Badge "Plano atual" */}
                {isCurrent && (
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

                {/* Badge label (Popular/Ultimate) — só mostra se não for o atual */}
                {plan.label && !isCurrent && (
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
                  onClick={() => !disabled && plan.id !== 'free' && setPayingPlan(plan)}
                  disabled={disabled}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 50,
                    border: disabled ? '1px solid rgba(255,255,255,0.08)'
                      : plan.id === 'boost' ? 'none'
                      : `1.5px solid ${plan.borderColor}`,
                    background: disabled
                      ? isCurrent ? `rgba(${plan.id === 'boost' ? '200,242,60' : plan.id === 'mega' ? '167,139,250' : '136,136,170'},0.08)` : 'transparent'
                      : plan.id === 'boost' ? '#c8f23c'
                      : plan.id === 'mega' ? 'linear-gradient(135deg, #a78bfa, #7c5cbf)'
                      : 'transparent',
                    color: disabled
                      ? isCurrent ? plan.color : '#333355'
                      : plan.id === 'boost' ? '#000' : '#f0f0f8',
                    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                    cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s',
                    boxShadow: disabled ? 'none'
                      : plan.id === 'boost' ? '0 0 20px rgba(200,242,60,0.3)'
                      : plan.id === 'mega' ? '0 0 20px rgba(167,139,250,0.3)' : 'none',
                  }}
                >
                  {ctaLabel}
                </button>

                {/* Hint de downgrade */}
                {!disabled && !upgrade && plan.id !== 'free' && (
                  <p style={{ color: '#555577', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                    Entre em contato com o suporte para downgrade
                  </p>
                )}
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
              Após o pagamento, envie o comprovante direto pelo site. Seu plano será ativado em até 24 horas.
            </p>
          </div>
        </div>
      </main>

      {/* MODAL PIX */}
      {payingPlan && (
        <>
          <div
            onClick={() => { setPayingPlan(null); setReceipt(null) }}
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
                onClick={() => { setPayingPlan(null); setReceipt(null) }}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', color: '#8888aa',
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

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

            {/* Divisor */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 20, paddingTop: 20,
            }}>
              <p style={{ color: '#f0f0f8', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>
                📎 Enviar comprovante
              </p>
              <p style={{ color: '#8888aa', fontSize: 12, lineHeight: 1.6, margin: '0 0 14px' }}>
                Após pagar, anexe o comprovante abaixo. Seu plano será ativado em até <span style={{ color: '#c8f23c', fontWeight: 700 }}>24 horas</span>.
              </p>

              {/* Upload area */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('Arquivo muito grande. Máximo 10MB.')
                      return
                    }
                    setReceipt(file)
                  }
                }}
              />

              {receipt ? (
                <div style={{
                  background: 'rgba(200,242,60,0.06)',
                  border: '1px solid rgba(200,242,60,0.2)',
                  borderRadius: 12, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>
                      {receipt.type === 'application/pdf' ? '📄' : '🖼️'}
                    </span>
                    <span style={{
                      color: '#c8f23c', fontSize: 13, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {receipt.name}
                    </span>
                  </div>
                  <button
                    onClick={() => { setReceipt(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    style={{
                      background: 'none', border: 'none', color: '#8888aa',
                      cursor: 'pointer', fontSize: 16, flexShrink: 0, padding: 0,
                    }}
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1.5px dashed rgba(255,255,255,0.12)',
                    borderRadius: 12, color: '#8888aa', cursor: 'pointer',
                    fontFamily: "'Syne', sans-serif", fontSize: 13,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = payingPlan.borderColor
                    e.currentTarget.style.color = '#f0f0f8'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.color = '#8888aa'
                  }}
                >
                  <span style={{ fontSize: 24 }}>📎</span>
                  <span style={{ fontWeight: 600 }}>Clique para anexar</span>
                  <span style={{ fontSize: 11 }}>PNG, JPG, PDF — até 10MB</span>
                </button>
              )}
            </div>

            {/* Botão enviar */}
            <button
              onClick={handleSubmitReceipt}
              disabled={!receipt || uploading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 50,
                border: 'none',
                background: !receipt || uploading
                  ? 'rgba(255,255,255,0.05)'
                  : payingPlan.id === 'boost'
                  ? '#c8f23c'
                  : 'linear-gradient(135deg, #a78bfa, #7c5cbf)',
                color: !receipt || uploading
                  ? '#333355'
                  : payingPlan.id === 'boost' ? '#000' : '#fff',
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15,
                cursor: !receipt || uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: !receipt || uploading ? 'none'
                  : payingPlan.id === 'boost'
                  ? '0 0 24px rgba(200,242,60,0.35)'
                  : '0 0 24px rgba(167,139,250,0.35)',
              }}
            >
              {uploading ? '⏳ Enviando...' : '✓ Enviar comprovante'}
            </button>
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