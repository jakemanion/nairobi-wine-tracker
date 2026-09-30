type BrandLogoProps = {
  className?: string
  height?: number
}

/** Bookmark-style WineDiviner mark for header branding. */
export function BrandLogo({ className, height = 36 }: BrandLogoProps) {
  // Source art is 211×335 (tall ribbon); keep aspect ratio from height.
  const width = Math.round((height * 211) / 335)

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand mark
    <img
      src="/wine-diviner-logo.png"
      alt=""
      width={width}
      height={height}
      className={className}
      style={{ width, height, flexShrink: 0, display: 'block' }}
    />
  )
}
