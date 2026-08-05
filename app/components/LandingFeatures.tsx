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
      desc: 'Crie e participe de comunidades por interesse. Cada comunidade tem seu próprio feed, moderadores e regras.',
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
      desc: 'Mensagens em ordem cronológica, sem recomendações automáticas de contatos.',
      icon: '◈',
      accent: 'green',
    },
    {
      col: '1 / 3',
      row: '3 / 5',
      title: 'Feed visual',
      desc: 'Posts de imagem, vídeo e texto em um feed cronológico que prioriza sua escolha.',
      icon: '◇',
      accent: 'purple',
    },
    {
      col: '3 / 5',
      row: '3 / 4',
      title: 'Plano grátis de verdade',
      desc: 'Recursos básicos gratuitos com opções de funcionalidades avançadas planejadas para criadores.',
      icon: '◆',
      accent: 'green',
    },
    {
      col: '3 / 5',
      row: '4 / 5',
      title: 'Reações, não só like',
      desc: 'Seis opções de reação para expressar diferentes sentimentos em posts.',
      icon: '◐',
      accent: 'purple',
    },
    {
      col: '5 / 7',
      row: '3 / 5',
      title: 'Sem rastreamento',
      desc: 'Privacidade em foco, com menos dependência de dados de engajamento para recomendações.',
      icon: '◯',
      accent: 'green',
    },
  ]

  return (
    <section id="features" className="landing-features container-vtx">
      <div className="landing-features-header">
        <div className="landing-features-pill">◉ Recursos</div>

        <h2 className="landing-features-title">
          Tudo que você precisa. <span className="landing-features-title-muted">Nada que você não precisa.</span>
        </h2>

        <p className="landing-features-copy">
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
