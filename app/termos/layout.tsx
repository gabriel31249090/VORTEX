import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso do VORTEX.',
  alternates: { canonical: '/termos' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
