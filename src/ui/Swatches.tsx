import type { CSSProperties, ReactNode } from 'react'
import { haptic } from '../features/sound'

export interface SwatchOption<T extends string> {
  value: T
  label: string
  /** Örnek dairenin CSS stili (renk ya da geçiş). */
  style?: CSSProperties
  content?: ReactNode
}

/** Ayar penceresindeki renk/seçenek ızgarası; her seçenek adıyla okunur. */
export function Swatches<T extends string>({ options, value, onChange, label, disabled }: { options: SwatchOption<T>[]; value: T; onChange: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`swatches__opt${o.value === value ? ' is-on' : ''}`}
          disabled={disabled}
          title={o.label}
          onClick={() => {
            haptic(8)
            onChange(o.value)
          }}
        >
          <span className="swatches__dot" style={o.style}>
            {o.content}
          </span>
          <span className="swatches__name">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
