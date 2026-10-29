import { useEffect, useRef, useState } from 'react'
import { Swatches, type SwatchOption } from './Swatches'

/**
 * Ayarlarda tek satırlık renk alanı: seçili rengi gösterir; dokununca küçük bir
 * pencerede tüm seçenekler çıkar, seçince kapanır. Böylece ayar listesi kalabalık olmaz.
 */
export function ColorField<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: SwatchOption<T>[]; onChange: (v: T) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  const current = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <>
      <button type="button" className="colorfield" disabled={disabled} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="colorfield__label">{label}</span>
        <span className="colorfield__value">
          <span className="swatches__dot" style={current?.style}>
            {current?.content}
          </span>
          <span>{current?.label}</span>
        </span>
      </button>
      <dialog
        ref={ref}
        className="cpop"
        aria-label={label}
        onClose={() => setOpen(false)}
        onCancel={(e) => {
          e.preventDefault()
          setOpen(false)
        }}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false)
        }}
      >
        {open && (
          <div className="cpop__panel">
            <h3 className="cpop__title">{label}</h3>
            <Swatches
              label={label}
              value={value}
              options={options}
              onChange={(v) => {
                onChange(v)
                setOpen(false)
              }}
            />
          </div>
        )}
      </dialog>
    </>
  )
}
