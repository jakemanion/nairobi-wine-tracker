import { DM_Sans, Playfair_Display } from 'next/font/google'
import type { ReactNode } from 'react'

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
    <div
      className={`${playfair.variable} ${dmSans.variable} min-h-screen`}
      style={{
        fontFamily: 'var(--font-dm-sans), sans-serif',
        background: '#14141A',
        color: '#EDE8E0',
      }}
    >
      {children}
    </div>
  )
}
