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
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      id="showcase"
      ref={ref}
      className="container-vtx"
      style={{ padding: 'clamp(60px, 10vw, 120px) 24px' }}
    >
      <div style={{ maxWidth: 720, marginBottom: 56 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            border: '1px solid var(--border-2)',
            background: 'rgba(139, 92, 246, 0.07)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--purple)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 24,
          }}
        >
          ◇ Como funciona
        </div>

        <h2
          style={{
            fontSize: 'clamp(36px, 6vw, 60px)',
            fontWeight: 800,
            color: 'var(--text)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            marginBottom: 20,
            textWrap: 'balance',
          }}
        >
          Um feed que <span style={{ color: 'var(--green)' }}>você</span> controla.
        </h2>

        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--text-2)',
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          Cronológico por padrão. Sem &ldquo;para você&rdquo; misterioso.
          Você escolhe o que aparece, sem deixar a IA decidir o que te faz
          ficar.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 20,
        }}
      >
        <MockCard
          delay={0}
          visible={visible}
          variant="text"
          author="marina.codes"
          community="r/programação"
          time="2h"
          title="Passei 6 meses migrando um monolito pra serverless. Aqui está o que eu queria saber no dia 1."
        />
        <MockCard
          delay={120}
          visible={visible}
          variant="image"
          author="leo.shoots"
          community="r/fotografia"
          time="4h"
          title="Aurora boreal na Islândia, sem filtro. ISO 6400, 15s."
        />
        <MockCard
          delay={240}
          visible={visible}
          variant="poll"
          author="vortex.team"
          community="anúncios"
          time="1d"
          title="Qual feature você quer ver no VORTEX primeiro?"
          options={[
            { label: 'Reações customizadas', pct: 48 },
            { label: 'Voice notes em DM', pct: 27 },
            { label: 'Posts agendados', pct: 18 },
            { label: 'Live rooms', pct: 7 },
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
  likes = 124,
  comments = 18,
  options,
}: MockCardProps) {
  return (
    <article
      className="surface"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        cursor: 'default',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--green) 0%, var(--purple) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#000',
            fontSize: 14,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {author[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--text)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            @{author}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {community} · {time}
          </div>
        </div>
      </div>

      {/* Body */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.35,
          marginBottom: variant === 'image' ? 14 : 16,
          textWrap: 'balance',
        }}
      >
        {title}
      </h3>

      {variant === 'image' && (
        <div
          aria-hidden="true"
          style={{
            height: 180,
            borderRadius: 'var(--radius)',
            background:
              'linear-gradient(135deg, rgba(200,242,60,0.4) 0%, rgba(139,92,246,0.4) 50%, rgba(200,242,60,0.2) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 50%)',
            }}
          />
        </div>
      )}

      {variant === 'poll' && options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                fontSize: 13,
                fontFamily: "'Inter', sans-serif",
                color: 'var(--text)',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    i === 0
                      ? 'linear-gradient(90deg, rgba(200,242,60,0.18), transparent)'
                      : 'rgba(255,255,255,0.02)',
                  width: `${opt.pct}%`,
                  transition: 'width 1s ease 0.4s',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{opt.label}</span>
                <span
                  style={{
                    color: 'var(--text-2)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {opt.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          color: 'var(--text-2)',
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>♥ {likes.toLocaleString('pt-BR')}</span>
        <span>💬 {comments}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>↗</span>
      </div>
    </article>
  )
}
