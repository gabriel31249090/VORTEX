import FeatureCard from './FeatureCard'

export default function LandingFeatures() {
  // Bento grid: 6 colunas desktop / 1 coluna mobile (via .vtx-bento no globals.css)
  const features: Array<{
    col: string
    row: string
    title: string
    desc: string
    icon: string
    accent: 'green' | 'purple'
  }> = [
    {
      col: '1 / 4',
      row: '1 / 3',
      title: 'Comunidades',
      desc: 'Crie e participe de comunidades por interesse. Cada uma tem seu feed, mods, regras, flair. Tipo subreddit, mas com cara de Instagram.',
      icon: '◉',
      accent: 'green',
    },
    {
      col: '4 / 7',
      row: '1 / 2',
      title: 'Stories que somem',
      desc: '24h de vida. Sem deixar rastro, sem métrica eterna, sem replay.',
      icon: '✦',
      accent: 'purple',
    },
    {
      col: '4 / 7',
      row: '2 / 3',
      title: 'DMs sem algorítmo',
      desc: 'Mensagens em ordem cronológica. Sem "pessoas que talvez você conheça" te empurrando ex.',
      icon: '◈',
      accent: 'green',
    },
    {
      col: '1 / 3',
      row: '3 / 5',
      title: 'Feed visual',
      desc: 'Posts em imagem, vídeo e texto, num feed cronológico que respeita sua escolha — não o que dá mais engajamento pra plataforma.',
      icon: '◇',
      accent: 'purple',
    },
    {
      col: '3 / 5',
      row: '3 / 4',
      title: 'Plano grátis de verdade',
      desc: 'Sem paywall em cima de feature básica. Boost é pra quem quer analytics, Mega pra creator.',
      icon: '◆',
      accent: 'green',
    },
    {
      col: '3 / 5',
      row: '4 / 5',
      title: 'Reações, não só like',
      desc: '6 emojis temáticos. Curtir, aplaudir, zoar. Mais nuance, menos brigas.',
      icon: '◐',
      accent: 'purple',
    },
    {
      col: '5 / 7',
      row: '3 / 5',
      title: 'Sem rastreamento',
      desc: 'Seu scroll não vira produto. Não vendemos seus dados pra ad network. Por isso o plano grátis pode existir.',
      icon: '◯',
      accent: 'green',
    },
  ]

  return (
    <section
      id="features"
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
            background: 'rgba(200, 242, 60, 0.05)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--green)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 24,
          }}
        >
          ◉ Recursos
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
          Tudo que você precisa. <span style={{ color: 'var(--text-3)' }}>Nada que você não precisa.</span>
        </h2>

        <p
          style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--text-2)',
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          Cada feature existe por um motivo. Sem métricas vaidosas, sem dark
          patterns, sem upsell escondido atrás do botão de postar.
        </p>
      </div>

      <div className="vtx-bento">
        {features.map((f, i) => (
          <FeatureCard
            key={f.title}
            title={f.title}
            desc={f.desc}
            icon={f.icon}
            accent={f.accent}
            col={f.col}
            row={f.row}
          />
        ))}
      </div>
    </section>
  )
}
