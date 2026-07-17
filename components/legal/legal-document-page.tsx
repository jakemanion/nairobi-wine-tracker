import Link from 'next/link'
import { LegalMarkdown } from '@/components/legal/legal-markdown'
import { SiteFooter } from '@/components/site-footer'
import { loadLegalMarkdown, LEGAL_DOC_META, type LegalDocSlug } from '@/lib/legal/legal-docs'
import { getPreviewColors } from '@/lib/preview/preview-colors'

const colors = getPreviewColors('dark')
const accent = '#C93048'
const CONTENT_MAX_WIDTH = '42rem'

type LegalDocumentPageProps = {
  slug: LegalDocSlug
}

export async function LegalDocumentPage({ slug }: LegalDocumentPageProps) {
  const markdown = await loadLegalMarkdown(slug)
  const meta = LEGAL_DOC_META[slug]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.pageBg }}>
      <header
        style={{
          background: colors.headerBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
        }}
      >
        <div
          className="mx-auto px-6 py-3 flex items-center justify-between gap-4"
          style={{ maxWidth: CONTENT_MAX_WIDTH }}
        >
          <div className="min-w-0">
            <Link href="/" className="no-underline">
              <h1
                className="text-base font-semibold leading-none truncate"
                style={{ color: colors.headerTitle, fontFamily: 'var(--font-playfair), serif' }}
              >
                WineDiviner: Nairobi
              </h1>
            </Link>
            <p
              className="text-[10px] mt-1 truncate"
              style={{ color: colors.headerSub, fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {meta.heading}
            </p>
          </div>
          <Link
            href="/"
            className="text-xs flex-shrink-0 no-underline"
            style={{ color: accent, fontFamily: 'var(--font-dm-sans), sans-serif' }}
          >
            Back to wine list
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <article
          className="mx-auto w-full rounded-xl p-5 sm:p-7"
          style={{
            maxWidth: CONTENT_MAX_WIDTH,
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: colors.cardShadow,
          }}
        >
          <LegalMarkdown markdown={markdown} />
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
