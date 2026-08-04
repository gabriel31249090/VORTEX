import FeatureCard from './FeatureCard'

export default function LandingFeatures() {
  // Bento grid: 6 colunas, 4 rows
  // Cada card ocupa um pedaço diferente pra dar layout assimétrico
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
      style={{
        position: 'relative',
        padding: '120px 32px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: 72, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--green)',
            letterSpacing: '0.25em',
            marginBottom: 18,
          }}
        >
          RECURSOS
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
          Tudo que você precisa.
          <br />
          <span style={{ color: 'var(--text2)' }}>Nada que você não precisa.</span>
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridAutoRows: '160px',
          gap: 14,
        }}
      >
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} />
        ))}
      </div>
    </section>
  )
}
