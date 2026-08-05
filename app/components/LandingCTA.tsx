import Link from 'next/link'

export default function LandingCTA() {
  return (
    <section className="landing-cta-section">
      <div className="landing-cta-card surface glass">
        <div aria-hidden className="landing-cta-glow" />
        <div className="landing-cta-content">
          <div className="landing-cta-pretitle">BORA?</div>
          <h2 className="landing-cta-title">Pronto pra entrar no vórtice?</h2>
          <p className="landing-cta-copy">
            Cria em 30 segundos, sem cartão, sem algoritmo te vigiando.
            Open source no GitHub.
          </p>
          <div className="landing-cta-actions">
            <Link href="/register" className="neon-btn landing-cta-btn">
              Criar conta grátis →
            </Link>
            <Link href="/login" className="landing-cta-btn landing-cta-btn-secondary">
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
