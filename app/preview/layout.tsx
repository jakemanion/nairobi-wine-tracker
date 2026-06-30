import { DM_Sans, Playfair_Display } from 'next/font/google'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'WineDiviner: Nairobi',
}

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${playfair.variable} ${dmSans.variable} min-h-screen`}>
      {children}
    </div>
  )
}
