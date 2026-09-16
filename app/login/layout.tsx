import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Entre na sua conta VORTEX.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
