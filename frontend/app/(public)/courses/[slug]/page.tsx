import type { Metadata } from 'next'
import { cache } from 'react'
import CourseDetailClient from './CourseDetailClient'

const getCourse = cache(async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1/courses/${slug}`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  return res.json()
})

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) return { title: 'Course Not Found' }
  const description = course.description ?? `Enroll in ${course.title} and grow in your faith.`
  return {
    title: `${course.title} | Forgiven Generation Church`,
    description,
    openGraph: {
      title: course.title,
      description,
      images: course.thumbnail_url
        ? [{ url: course.thumbnail_url, width: 1200, height: 630, alt: course.title }]
        : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: course.title,
      description,
      images: course.thumbnail_url ? [course.thumbnail_url] : [],
    },
  }
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const course = await getCourse(slug)
  return (
    <>
      {course && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Course',
              name: course.title,
              description: course.description,
              provider: {
                '@type': 'Organization',
                name: 'Forgiven Generation Church',
              },
              image: course.thumbnail_url,
              offers: {
                '@type': 'Offer',
                price: course.price_usd,
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      )}
      <CourseDetailClient />
    </>
  )
}
