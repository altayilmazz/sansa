import { useEffect, useRef, type ReactNode } from 'react'
import { IconButton } from './controls'

/**
 * Alt sayfa (mobil) / ortalanmış pencere (masaüstü). Yerel <dialog> sayesinde
 * odak yakalama, Escape ile kapanma ve ekran okuyucu davranışı tarayıcıdan gelir.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="sheet__panel">
          <div className="sheet__grabber" aria-hidden="true" />
          <header className="sheet__head">
            <h2 className="sheet__title">{title}</h2>
            <IconButton icon="close" label="Kapat" onClick={onClose} />
          </header>
          <div className="sheet__body">{children}</div>
        </div>
      )}
    </dialog>
  )
}
