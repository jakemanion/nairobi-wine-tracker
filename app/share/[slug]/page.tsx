import Link from 'next/link'
import { SharedWineList } from '@/components/preview/shared-wine-list'
import { PreviewThemeProvider } from '@/components/preview/preview-theme-context'
import { getPreviewSession } from '@/lib/auth/preview-session'
import { loadSharedListPageData } from '@/lib/share/load-shared-list'

export const dynamic = 'force-dynamic'

type SharePageProps = {
  params: Promise<{ slug: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params
  const session = await getPreviewSession()
  const data = await loadSharedListPageData({
    slug,
    viewerUserId: session.isLoggedIn ? session.userId : null,
  })

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#14141A' }}>
        <div className="text-center max-w-sm">
          <h1
            className="m-0 text-xl font-semibold"
            style={{ color: '#F5F2EC', fontFamily: 'var(--font-playfair), serif' }}
          >
            Share link not found
          </h1>
          <p className="mt-3 text-sm" style={{ color: '#A8A4B8' }}>
            This shared collection doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/"
            className="inline-block mt-5 text-[13px] px-4 py-2 rounded-lg no-underline"
            style={{
              background: '#C93048',
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            Back to wine list
          </Link>
        </div>
      </main>
    )
  }

  const nextPath = `/share/${slug}`

  return (
    <PreviewThemeProvider>
      <SharedWineList
        key={session.isLoggedIn ? `${session.userId}:${slug}` : `guest:${slug}`}
        wines={data.wines}
        collectionLabels={data.collectionLabels}
        sharePath={nextPath}
        isLoggedIn={session.isLoggedIn}
        userId={session.userId ?? ''}
        userName={session.userName ?? ''}
        userEmail={session.userEmail ?? ''}
      />
    </PreviewThemeProvider>
  )
}
