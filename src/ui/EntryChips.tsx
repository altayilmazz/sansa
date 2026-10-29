import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { duplicateKeys, normalize, type Entry } from '../lib/entries'
import { haptic } from '../features/sound'
import { useDragDelete } from './dragDelete'

interface ChipsProps {
  entries: Entry[]
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  disabled?: boolean
  /** cloud: ortalı bulut (takım), list: sağa yaslı dar liste (kura). */
  variant?: 'cloud' | 'list'
  /** Üzeri çizili gösterilecek kayıtlar (ör. çekilmiş olanlar). */
  struck?: ReadonlySet<string>
  /** Listenin başında, ilk kayıttan önce duran öğe (ör. geri al düğmesi). */
  lead?: ReactNode
  /** Paylaşılan yerleşim animasyonu (kimlik öneki); verilmezse kapalı. */
  layoutPrefix?: string
  className?: string
}

const HOLD_MS = 320 // dokunmatikte sürüklemeyi başlatan basılı tutma süresi
const SLOP = 9 // bu kadar kıpırdarsa basılı tutma iptal olur ve sayfa kayar

/**
 * Kayıt çipleri. Dokununca yerinde düzenlenir; basılı tutup sürükleyince
 * büyük çöp alanına bırakılarak silinir. Klavyede Enter düzenler, Delete siler.
 */
export function EntryChips({ entries, onRename, onRemove, disabled, variant = 'cloud', struck, lead, layoutPrefix, className = '' }: ChipsProps) {
  const dups = useMemo(() => duplicateKeys(entries), [entries])
  return (
    <ul className={`chips chips--${variant} ${className}`} aria-label="Kayıtlar">
      {lead}
      {entries.map((e, i) => (
        <li key={e.id} className="chips__item" style={{ '--i': i } as CSSProperties}>
          <Chip
            entry={e}
            dup={dups.has(normalize(e.name))}
            struck={struck?.has(e.id)}
            disabled={disabled}
            small={variant === 'list'}
            layoutId={layoutPrefix ? `${layoutPrefix}${e.id}` : undefined}
            onRename={(name) => onRename(e.id, name)}
            onRemove={() => onRemove(e.id)}
          />
        </li>
      ))}
    </ul>
  )
}

interface ChipProps {
  entry: Entry
  dup: boolean
  struck?: boolean
  disabled?: boolean
  small?: boolean
  layoutId?: string
  onRename: (name: string) => void
  onRemove: () => void
}

interface Gesture {
  id: number
  sx: number
  sy: number
  timer: number
  active: boolean
}

function Chip({ entry, dup, struck, disabled, small, layoutId, onRename, onRemove }: ChipProps) {
  const dd = useDragDelete()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.name)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const g = useRef<Gesture | null>(null)
  const block = useRef<((e: TouchEvent) => void) | null>(null)

  // Bileşen kalkarsa dinleyici ve zamanlayıcı geride kalmasın
  useEffect(
    () => () => {
      if (g.current) window.clearTimeout(g.current.timer)
      if (block.current) document.removeEventListener('touchmove', block.current)
    },
    [],
  )

  const stopBlocking = () => {
    if (block.current) document.removeEventListener('touchmove', block.current)
    block.current = null
  }

  const activate = (el: HTMLElement) => {
    const s = g.current
    if (!s || s.active) return
    s.active = true
    try {
      el.setPointerCapture(s.id)
    } catch {
      /* yakalama desteklenmiyorsa hareket yine de işlenir */
    }
    haptic(15)
    dd?.begin()
    setGhost({ x: s.sx, y: s.sy })
    // Sürükleme sürerken sayfa kaymasın
    block.current = (ev: TouchEvent) => ev.preventDefault()
    document.addEventListener('touchmove', block.current, { passive: false })
  }

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    const el = e.currentTarget
    const s: Gesture = { id: e.pointerId, sx: e.clientX, sy: e.clientY, timer: 0, active: false }
    g.current = s
    if (e.pointerType !== 'mouse') s.timer = window.setTimeout(() => activate(el), HOLD_MS)
  }

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = g.current
    if (!s || e.pointerId !== s.id) return
    if (!s.active) {
      if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > SLOP) {
        if (e.pointerType === 'mouse') activate(e.currentTarget)
        else {
          window.clearTimeout(s.timer)
          g.current = null // kullanıcı kaydırıyor
        }
      }
      return
    }
    setGhost({ x: e.clientX, y: e.clientY })
    dd?.move(e.clientX, e.clientY)
  }

  const finish = (e: PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const s = g.current
    if (!s || e.pointerId !== s.id) return
    window.clearTimeout(s.timer)
    g.current = null
    stopBlocking()
    if (s.active) {
      const dropped = dd?.end(cancelled ? -1 : e.clientX, cancelled ? -1 : e.clientY) ?? false
      setGhost(null)
      if (dropped && !cancelled) {
        haptic(25)
        onRemove()
      }
      return
    }
    // Basılı tutma ve sürükleme olmadıysa kısa bir dokunuştur: düzenle
    if (!cancelled && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) <= SLOP) {
      setText(entry.name)
      setEditing(true)
    }
  }

  const keys = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onRemove()
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      setText(entry.name)
      setEditing(true)
    }
  }

  const commit = () => {
    const clean = text.replace(/\s+/g, ' ').trim()
    setEditing(false)
    if (clean && clean !== entry.name) onRename(clean)
  }

  const cls = `chip${small ? ' chip--sm' : ''}${struck ? ' is-struck' : ''}${dup ? ' is-dup' : ''}${ghost ? ' is-lifted' : ''}`

  if (editing) {
    return (
      <input
        className={`chip chip--input${small ? ' chip--sm' : ''}`}
        aria-label={`“${entry.name}” için yeni isim`}
        value={text}
        size={Math.max(4, text.length + 1)}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <>
      <motion.button
        type="button"
        layoutId={layoutId}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className={cls}
        disabled={disabled}
        title={dup ? 'Aynı isimde başka kayıt var' : undefined}
        aria-label={`${entry.name}${struck ? ', çıkarıldı' : ''}. Düzenlemek için dokun, silmek için basılı tutup çöp kutusuna sürükle.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onKeyDown={keys}
        onContextMenu={(e) => e.preventDefault()}
      >
        {entry.name}
      </motion.button>
      {ghost &&
        createPortal(
          <span className={`chip chip--ghost${small ? ' chip--sm' : ''}${dd?.over ? ' is-over' : ''}`} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
            {entry.name}
          </span>,
          document.body,
        )}
    </>
  )
}
