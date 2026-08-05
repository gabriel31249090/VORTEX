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
          Feed cronológico por padrão. Sem recomendações automatizadas que decidam o conteúdo.
          Você escolhe o que aparece e o que fica no seu fluxo.
        </p>
      </div>

      <div className="landing-showcase-grid">
        <MockCard
          delay={0}
          visible={visible}
          variant="text"
          author=""
          community=""
          time=""
          title="Compartilhe ideias, dúvidas e descobertas no seu ritmo."
        />
        <MockCard
          delay={120}
          visible={visible}
          variant="image"
          author=""
          community=""
          time=""
          title="Mostre seu melhor visual, sem filtros automáticos."
        />
        <MockCard
          delay={240}
          visible={visible}
          variant="poll"
          author=""
          community=""
          time=""
          title="Qual recurso você quer ver primeiro?"
          options={[
            { label: 'Reações customizadas', pct: 48 },
            { label: 'Notas de voz em DM', pct: 27 },
            { label: 'Posts agendados', pct: 18 },
            { label: 'Salas ao vivo', pct: 7 },
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
  likes = 0,
  comments = 0,
  options,
}: MockCardProps) {
  const showMeta = Boolean((community || time).trim())
  const showFooter = likes > 0 || comments > 0

  const showHeader = Boolean(author?.trim())

  return (
    <article
      className={`surface showcase-card ${visible ? 'showcase-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {showHeader && (
        <div className="showcase-card__header">
          <div aria-hidden="true" className="showcase-card__avatar">
            {author?.charAt(0).toUpperCase() || 'P'}
          </div>
          <div className="showcase-card__author-group">
            <div className="showcase-card__author">{author}</div>
            {showMeta && <div className="showcase-card__meta">{community}{community && time ? ' · ' : ''}{time}</div>}
          </div>
        </div>
      )}

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
      {showFooter && (
        <div className="showcase-card__footer">
          {likes > 0 && <span>♥ {likes.toLocaleString('pt-BR')}</span>}
          {comments > 0 && <span>💬 {comments}</span>}
          <span className="showcase-card__footer-icon">↗</span>
        </div>
      )}
    </article>
  )
}
