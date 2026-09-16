import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vortextalkanything.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/pricing', '/faq', '/termos', '/privacidade'],
      disallow: [
        '/admin',
        '/feed',
        '/messages',
        '/notifications',
        '/post/new',
        '/saved',
        '/search',
        '/settings',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
