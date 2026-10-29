/** Şansa'nın küçük zar işareti. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#efe9dc" />
      <circle cx="8" cy="8" r="1.9" fill="#1d1d1f" />
      <circle cx="16" cy="16" r="1.9" fill="#1d1d1f" />
      <circle cx="12" cy="12" r="2" fill="#0071e3" />
    </svg>
  )
}
