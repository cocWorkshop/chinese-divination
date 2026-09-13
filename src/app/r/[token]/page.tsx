import { Metadata } from 'next'
import { generateReadingMetadata } from '@/lib/share/readingMetadata'
import PublicReadingClient from './PublicReadingClient'

interface PageProps {
  params: Promise<{ token: string }> | { token: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await Promise.resolve(params)
  return generateReadingMetadata(token)
}

export default async function PublicReadingPage({ params }: PageProps) {
  const { token } = await Promise.resolve(params)
  return <PublicReadingClient token={token} />
}
