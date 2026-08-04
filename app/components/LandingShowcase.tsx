'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * LandingShowcase — mockup estilizado de feed pra mostrar o produto
 * sem precisar de dados reais. Três cards (texto, imagem, poll) com
 * animação de entrada em scroll.
 */
export default function LandingShowcase() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      style={{
        position: 'relative',
        padding: '100px 32px 60px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--green)',
            letterSpacing: '0.25em',
            marginBottom: 18,
          }}
        >
          COMO FUNCIONA
        </div>
        <h2
          style={{
            fontSize: 'clamp(36px, 5.2vw, 60px)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          Um feed que <span style={{ color: 'var(--green)' }}>você controla.</span>
        </h2>
        <p
          style={{
            color: 'var(--text2)',
            marginTop: 16,
            fontSize: 16,
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          Cronológico por padrão. Sem "para você" misterioso. Você escolhe
          o que aparece, sem deixar a IA decidir o que te faz ficar.
        </p>
      </div>

      <div
        ref={ref}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          maxWidth: 980,
          margin: '0 auto',
        }}
      >
        <MockCard
          delay={0}
          visible={visible}
          variant="text"
          author="cosmos.luna"
          community="r/astronomia"
          time="2h"
          title="Vi o buraco negro da M87 em 4K pelo telescópio novo. Não tô bem."
          likes={847}
          comments={62}
        />
        <MockCard
          delay={100}
          visible={visible}
          variant="image"
          author="void.arquitecto"
          community="r/design"
          time="4h"
          title="WIP do meu projeto pessoal. Critiquem sem dó."
          image="linear-gradient(135deg, #c8f23c 0%, #8b5cf6 100%)"
          likes={1240}
          comments={128}
        />
        <MockCard
          delay={200}
          visible={visible}
          variant="poll"
          author="dev.carioca"
          community="r/devbr"
          time="6h"
          title="Qual stack vocês usariam pra um SaaS em 2026?"
          options={[
            { label: 'Next + Supabase', pct: 62 },
            { label: 'Svelte + Convex', pct: 24 },
            { label: 'Remix + Postgres', pct: 14 },
          ]}
        />
      </div>
    </section>
  )
}

type MockCardProps = {
  delay: number
  visible: boolean
  variant: 'text' | 'image' | 'poll'
  author: string
  community: string
  time: string
  title: string
  image?: string
  likes?: number
  comments?: number
  options?: { label: string; pct: number }[]
}

function MockCard({
  delay,
  visible,
  variant,
  author,
  community,
  time,
  title,
  image,
  likes,
  comments,
  options,
}: MockCardProps) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background: 'rgba(17,17,24,0.6)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--green), var(--green-dim))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#000',
          }}
        >
          {author[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            {author}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text3)',
              fontFamily: 'var(--mono)',
            }}
          >
            {community} · {time}
          </div>
        </div>
      </div>

      {/* Body */}
      <div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--text)',
            fontWeight: 500,
          }}
        >
          {title}
        </div>

        {variant === 'image' && (
          <div
            style={{
              marginTop: 12,
              height: 140,
              borderRadius: 12,
              background: image,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,0.04) 12px, rgba(0,0,0,0.04) 24px)',
              }}
            />
          </div>
        )}

        {variant === 'poll' && options && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${opt.pct}%`,
                    background:
                      i === 0
                        ? 'rgba(200,242,60,0.18)'
                        : 'rgba(139,92,246,0.15)',
                    transition: 'width 1s ease',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    padding: '0 12px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--text)',
                  }}
                >
                  <span>{opt.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                    {opt.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {(likes !== undefined || comments !== undefined) && (
        <div
          style={{
            display: 'flex',
            gap: 18,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--text2)',
            fontFamily: 'var(--mono)',
          }}
        >
          {likes !== undefined && <span>♥ {likes.toLocaleString('pt-BR')}</span>}
          {comments !== undefined && <span>💬 {comments}</span>}
          <span style={{ marginLeft: 'auto' }}>↗</span>
        </div>
      )}
    </div>
  )
}
