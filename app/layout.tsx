import { DM_Sans, Playfair_Display } from 'next/font/google'
import type { Metadata } from 'next'
import { AgeGate, AuthenticatedPostHogIdentity } from '@/components/preview/age-gate'
import { CookieBanner } from '@/components/preview/cookie-banner'
import { getPreviewSession } from '@/lib/auth/preview-session'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'WineDiviner: Nairobi',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getPreviewSession()

  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthenticatedPostHogIdentity userId={session.userId} />
        <AgeGate />
        <CookieBanner userId={session.userId} />
        {children}
      </body>
    </html>
  )
}
