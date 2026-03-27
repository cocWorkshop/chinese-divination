import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://chinese-divination.com'

  const divinationTypes = [
    'bazi',
    'iching',
    'ziwei',
    'qimen',
    'fengshui',
    'meihua',
    'liuyao',
  ]

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/divination`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]

  const divinationPages: MetadataRoute.Sitemap = divinationTypes.map((type) => ({
    url: `${baseUrl}/${type}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  // TODO: Add /blog entries when blog feature is implemented
  // const blogPages: MetadataRoute.Sitemap = []

  return [...staticPages, ...divinationPages]
}
