import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/auth/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl()
  const lastModified = new Date()

  return [
    { url: `${origin}/`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${origin}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${origin}/cookies`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: `${origin}/accessibility`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
