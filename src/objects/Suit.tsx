import type { Suit } from '../lib/rules/cards'

/** Kart türleri SVG olarak çizilir; böylece hiçbir cihazda emojiye dönüşmez. */
export function SuitIcon({ suit, size = 16, className }: { suit: Suit; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {suit === 'kupa' && (
        <path fill="currentColor" d="M12 21.2s-7.6-4.7-9.7-9.3C.7 8.1 2.9 4 6.8 4c2.2 0 3.7 1.2 5.2 3.1C13.5 5.2 15 4 17.2 4c3.9 0 6.1 4.1 4.5 7.9-2.1 4.6-9.7 9.3-9.7 9.3z" />
      )}
      {suit === 'karo' && <path fill="currentColor" d="M12 1.8l8.2 10.2L12 22.2 3.8 12z" />}
      {suit === 'maca' && (
        <path
          fill="currentColor"
          d="M12 1.8s-8.2 6.3-9.6 10.6c-1.2 3.7 1.5 6.8 4.8 6.1 1.6-.3 2.7-1.3 3.4-2.5-.2 2.6-1.1 4.6-2.7 6.4h8.2c-1.6-1.8-2.5-3.8-2.7-6.4.7 1.2 1.8 2.2 3.4 2.5 3.3.7 6-2.4 4.8-6.1C20.2 8.1 12 1.8 12 1.8z"
        />
      )}
      {suit === 'sinek' && (
        <g fill="currentColor">
          <circle cx="12" cy="6.6" r="4.4" />
          <circle cx="6.6" cy="13.4" r="4.4" />
          <circle cx="17.4" cy="13.4" r="4.4" />
          <path d="M11 11h2c0 4.6.9 7.9 3 10.4H8c2.1-2.5 3-5.8 3-10.4z" />
        </g>
      )}
    </svg>
  )
}
