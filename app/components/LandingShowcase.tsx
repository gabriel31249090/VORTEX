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
      className="landing-showcase container-vtx"
    >
      <div className="landing-showcase-header">
        <div className="landing-tag">◇ Como funciona</div>

        <h2 className="landing-showcase-title">
          Um feed que <span className="landing-showcase-highlight">você</span> controla.
        </h2>

        <p className="landing-showcase-copy">
          Cronológico por padrão. Sem “para você” misterioso.
          Você escolhe o que aparece, sem deixar a IA decidir o que te faz
          ficar.
        </p>
      </div>

      <div className="landing-showcase-grid">
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
      className={`surface showcase-card ${visible ? 'showcase-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="showcase-card__header">
        <div aria-hidden="true" className="showcase-card__avatar">
          {author[0].toUpperCase()}
        </div>
        <div className="showcase-card__author-group">
          <div className="showcase-card__author">@{author}</div>
          <div className="showcase-card__meta">{community} · {time}</div>
        </div>
      </div>

      {/* Body */}
      <h3 className={`showcase-card__title ${variant === 'image' ? 'showcase-card__title--image' : ''}`}>
        {title}
      </h3>

      {variant === 'image' && (
        <div aria-hidden="true" className="showcase-card__image" />
      )}

      {variant === 'poll' && options && (
        <div className="showcase-card__poll">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`showcase-card__poll-option ${i === 0 ? 'showcase-card__poll-option--highlight' : ''}`}
            >
              <div
                aria-hidden="true"
                className="showcase-card__poll-progress"
                style={{ width: `${opt.pct}%` }}
              />
              <div className="showcase-card__poll-content">
                <span>{opt.label}</span>
                <span className="showcase-card__poll-percent">{opt.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="showcase-card__footer">
        <span>♥ {likes.toLocaleString('pt-BR')}</span>
        <span>💬 {comments}</span>
        <span className="showcase-card__footer-icon">↗</span>
      </div>
    </article>
  )
}
