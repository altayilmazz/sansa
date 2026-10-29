import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'
import { forwardRef, type CSSProperties, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { indexAtPointer, shortLabel, sliceAngle } from '../lib/rules/wheel'
import { sfx } from '../features/sound'
import { Icon } from '../ui/Icon'

export interface WheelHandle {
  /** Hedef açı önceden hesaplanmıştır; animasyon yalnızca oraya götürür. */
  spinTo(target: number, reduced: boolean): Promise<void>
  rotation(): number
}

// Renkler tokens.css içinde temaya göre tanımlıdır (--wheel-N, --wheel-Nt).
const PALETTE = [1, 2, 3, 4].map((n) => ({ fill: `var(--wheel-${n})`, text: `var(--wheel-${n}t)` }))

/** Komşu dilimlerin (ilk–son dahil) aynı renk almamasını sağlar. */
export function sliceColors(n: number) {
  const out = Array.from({ length: n }, (_, i) => i % PALETTE.length)
  if (n > 1 && out[n - 1] === out[0]) out[n - 1] = out[n - 2] === 1 ? 2 : 1
  return out.map((i) => PALETTE[i])
}

/** Dilim sayısına göre etikette gösterilecek en fazla karakter; 0 ise numara gösterilir. */
export function labelBudget(n: number): number {
  if (n <= 4) return 14
  if (n <= 6) return 12
  if (n <= 8) return 10
  if (n <= 12) return 8
  return 0
}

const R = 150

/** Dilimin görünen orta noktasına (merkezden ~0.6R) küçük düğmeyi yerleştirir. */
function trashPos(i: number, rotation: number, a: number): { left: string; top: string } {
  const theta = ((i * a + a / 2 + rotation) * Math.PI) / 180
  const r = R * 0.6
  const size = 2 * (R + 8)
  return { left: `${50 + ((r * Math.sin(theta)) / size) * 100}%`, top: `${50 - ((r * Math.cos(theta)) / size) * 100}%` }
}

export const Wheel = forwardRef<
  WheelHandle,
  {
    labels: string[]
    onPointerChange?: (i: number) => void
    winner?: number | null
    /** Verilirse bir dilime dokununca küçük bir çöp düğmesi çıkar ve seçeneği siler. */
    onRemove?: (i: number) => void
    disabled?: boolean
  }
>(function Wheel(
  { labels, onPointerChange, winner, onRemove, disabled },
  ref,
) {
  const rot = useMotionValue(0)
  const pointer = useRef<HTMLDivElement>(null)
  const last = useRef(-1)
  const [pointerIdx, setPointerIdx] = useState(0)
  const n = labels.length
  const a = sliceAngle(Math.max(n, 1))
  const budget = labelBudget(n)
  const colors = sliceColors(n)
  // Dokunulan dilim ve o andaki dönüş açısı (çöp düğmesi dilimin üstüne konur)
  const [sel, setSel] = useState<{ i: number; rot: number } | null>(null)
  const canRemove = !!onRemove && !disabled && n > 0 && labels.every((l) => l !== '')

  // Liste değişince ya da çark dönmeye başlayınca seçim kalkar; dışarı dokunmak da kaldırır.
  useEffect(() => setSel(null), [n, disabled])
  useEffect(() => {
    if (!sel) return
    const away = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.wheel__slice, .wheel__trash')) setSel(null)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [sel])

  useMotionValueEvent(rot, 'change', (v) => {
    if (n < 1) return
    const i = indexAtPointer(v, n)
    if (i !== last.current) {
      last.current = i
      setPointerIdx(i)
      onPointerChange?.(i)
      sfx.tick()
      const p = pointer.current
      if (p) p.animate([{ transform: 'rotate(-14deg)' }, { transform: 'rotate(0deg)' }], { duration: 140, easing: 'ease-out' })
    }
  })

  useImperativeHandle(ref, () => ({
    rotation: () => rot.get(),
    async spinTo(target, reduced) {
      if (reduced) {
        await animate(rot, target, { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] })
        return
      }
      const start = rot.get()
      // beklenti: hafifçe geri çekilme
      await animate(rot, start - 10, { duration: 0.22, ease: 'easeOut' })
      await animate(rot, target, { duration: 4.6, ease: [0.3, 0.04, 0.06, 1] })
    },
  }))

  const isWinNow = (i: number) => winner === i
  const fontSize = n <= 6 ? 15 : n <= 8 ? 13.5 : n <= 12 ? 12 : 14

  return (
    <div className="wheel">
      <div className="wheel__pointer" ref={pointer} aria-hidden="true">
        <svg viewBox="0 0 40 48" width="34" height="40">
          <path d="M20 46L4 10a16 16 0 1132 0z" className="wheel__ptr" />
          <circle cx="20" cy="16" r="5" className="wheel__ptr-dot" />
        </svg>
      </div>
      <div className="wheel__body">
      <motion.svg className="wheel__disc" viewBox={`${-R - 8} ${-R - 8} ${2 * R + 16} ${2 * R + 16}`} style={{ rotate: rot }} role="group" aria-label="Çark">
        <circle r={R + 6} className="wheel__rim" />
        {labels.map((label, i) => {
          const a0 = ((i * a - 90) * Math.PI) / 180
          const a1 = (((i + 1) * a - 90) * Math.PI) / 180
          const large = a > 180 ? 1 : 0
          const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`
          const mid = i * a + a / 2
          const text = budget ? (isWinNow(i) ? label : shortLabel(label, budget)) : String(i + 1)
          const isWin = isWinNow(i)
          const winScale = Math.max(1, Math.min(2, (R - 40) / (Math.max(text.length, 1) * fontSize * 0.58)))
          // Sol yarıdaki yazılar ters durmasın: 180° çevrilip merkeze doğru hizalanır.
          const flip = budget > 0 && mid > 180
          return (
            <g
              key={i}
              className={`wheel__slice${sel?.i === i ? ' is-sel' : ''}`}
              role={canRemove ? 'button' : undefined}
              tabIndex={canRemove ? 0 : undefined}
              aria-label={canRemove ? `${label}. Silmek için seç.` : undefined}
              onClick={canRemove ? () => setSel({ i, rot: rot.get() }) : undefined}
              onKeyDown={
                canRemove
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSel({ i, rot: rot.get() })
                      }
                    }
                  : undefined
              }
            >
              <path d={d} className="wheel__seg" style={{ fill: colors[i].fill }} />
              {isWin && <path d={d} fill="#ffffff" opacity="0.18" className="wheel__win" />}
              <g transform={`rotate(${mid - 90})${flip ? ' rotate(180)' : ''}`}>
                <text
                  x={budget ? (flip ? -(R - 16) : R - 16) : R - 22}
                  y={0}
                  textAnchor={budget ? (flip ? 'start' : 'end') : 'middle'}
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight={600}
                  fontFamily="var(--font)"
                  className={isWin && budget ? 'wheel__label is-win' : 'wheel__label'}
                  style={{ fill: colors[i].text, transformOrigin: flip ? '0% 50%' : '100% 50%', '--ws': winScale } as CSSProperties}
                  transform={budget ? undefined : `rotate(90 ${R - 22} 0)`}
                >
                  {text}
                </text>
              </g>
            </g>
          )
        })}
        {Array.from({ length: n }, (_, i) => {
          const ang = ((i * a - 90) * Math.PI) / 180
          return <circle key={`peg${i}`} cx={(R + 1) * Math.cos(ang)} cy={(R + 1) * Math.sin(ang)} r={3} className="wheel__peg" />
        })}
        <circle r={26} className="wheel__hub" />
        <circle r={8} className="wheel__hub-dot" />
      </motion.svg>
      {sel && canRemove && sel.i < n && (
        <button
          type="button"
          className="wheel__trash"
          style={trashPos(sel.i, sel.rot, a)}
          aria-label={`“${labels[sel.i]}” seçeneğini sil`}
          onClick={() => {
            const i = sel.i
            setSel(null)
            onRemove?.(i)
          }}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
      </div>
      <p className="wheel__under" aria-hidden="true">
        {n > 0 && winner == null ? labels[pointerIdx] ?? '' : ' '}
      </p>
    </div>
  )
})
