import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'Política de Privacidade do VORTEX.',
  alternates: { canonical: '/privacidade' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
