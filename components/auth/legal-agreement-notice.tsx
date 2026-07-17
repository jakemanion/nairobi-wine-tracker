import Link from 'next/link'

type LegalAgreementNoticeProps = {
  mutedColor: string
  accentColor: string
}

export function LegalAgreementNotice({ mutedColor, accentColor }: LegalAgreementNoticeProps) {
  return (
    <p
      className="text-[11px] leading-relaxed text-center m-0"
      style={{ color: mutedColor, fontFamily: 'var(--font-dm-sans), sans-serif' }}
    >
      By creating an account you agree to the{' '}
      <Link href="/terms" className="no-underline hover:underline underline-offset-2" style={{ color: accentColor }}>
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link href="/privacy" className="no-underline hover:underline underline-offset-2" style={{ color: accentColor }}>
        Privacy Policy
      </Link>
      .
    </p>
  )
}
