import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Dúvidas frequentes sobre o VORTEX, conta, comunidades, segurança e recursos.',
  alternates: { canonical: '/faq' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
