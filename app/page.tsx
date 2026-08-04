import LandingNav from './components/LandingNav'
import LandingHero from './components/LandingHero'
import LandingFeatures from './components/LandingFeatures'
import LandingShowcase from './components/LandingShowcase'
import LandingCTA from './components/LandingCTA'
import LandingFooter from './components/LandingFooter'

export default function Home() {
  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: 'var(--bg)',
        overflowX: 'hidden',
      }}
    >
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingShowcase />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
