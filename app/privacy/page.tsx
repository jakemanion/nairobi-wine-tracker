import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/legal-document-page'
import { LEGAL_DOC_META } from '@/lib/legal/legal-docs'

const meta = LEGAL_DOC_META.privacy

export const metadata: Metadata = {
  title: `${meta.title} | WineDiviner: Nairobi`,
  description: meta.description,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${meta.title} | WineDiviner: Nairobi`,
    description: meta.description,
    type: 'article',
  },
}

export default function PrivacyPage() {
  return <LegalDocumentPage slug="privacy" />
}
