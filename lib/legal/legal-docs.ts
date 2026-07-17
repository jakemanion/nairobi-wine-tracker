import { readFile } from 'fs/promises'
import path from 'path'

export type LegalDocSlug = 'privacy' | 'terms' | 'cookies' | 'accessibility'

const DOC_FILES: Record<LegalDocSlug, string> = {
  privacy: 'privacy.md',
  terms: 'terms.md',
  cookies: 'cookies.md',
  accessibility: 'accessibility.md',
}

export const LEGAL_DOC_META: Record<
  LegalDocSlug,
  { title: string; description: string; heading: string }
> = {
  privacy: {
    title: 'Privacy Policy',
    heading: 'Privacy Policy',
    description:
      'How WineDiviner: Nairobi collects, uses, and protects your personal information.',
  },
  terms: {
    title: 'Terms of Service',
    heading: 'Terms of Service',
    description: 'Terms that govern your use of WineDiviner: Nairobi.',
  },
  cookies: {
    title: 'Cookie Policy',
    heading: 'Cookie Policy',
    description: 'How WineDiviner: Nairobi uses cookies and similar technologies.',
  },
  accessibility: {
    title: 'Accessibility Statement',
    heading: 'Accessibility Statement',
    description: 'WineDiviner: Nairobi accessibility goals, limitations, and feedback channels.',
  },
}

export async function loadLegalMarkdown(slug: LegalDocSlug): Promise<string> {
  const filePath = path.join(process.cwd(), 'content', 'legal', DOC_FILES[slug])
  return readFile(filePath, 'utf8')
}
