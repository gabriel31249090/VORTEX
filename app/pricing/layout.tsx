import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Planos',
  description: 'Conheça os planos Free, BOOST e MEGA BOOST do VORTEX.',
  alternates: { canonical: '/pricing' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
