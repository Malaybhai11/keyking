import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/api/', '/billing/'],
    },
    sitemap: 'https://keyking.ledgion.in/sitemap.xml',
  }
}
