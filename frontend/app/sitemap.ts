import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://forgivengeneration.church'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

  let courses: { slug: string; updated_at?: string }[] = []
  try {
    const res = await fetch(`${apiUrl}/api/v1/courses`)
    if (res.ok) courses = await res.json()
  } catch {}

  const courseEntries = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/courses`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...courseEntries,
  ]
}
