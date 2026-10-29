import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion/react'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { indexAtPointer, shortLabel, sliceAngle } from '../lib/rules/wheel'
import { sfx } from '../features/sound'

export interface WheelHandle {
  /** Hedef açı önceden hesaplanmıştır; animasyon yalnızca oraya götürür. */
  spinTo(target: number, reduced: boolean): Promise<void>
  rotation(): number
}

const PALETTE = [
  { fill: '#ff9f0a', text: '#1c1205' },
  { fill: '#26262a', text: '#f4f1ea' },
  { fill: '#efe9dc', text: '#1c1c1e' },
  { fill: '#c2410c', text: '#fff4ea' },
]

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

export const Wheel = forwardRef<WheelHandle, { labels: string[]; onPointerChange?: (i: number) => void; winner?: number | null }>(function Wheel(
  { labels, onPointerChange, winner },
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

  const fontSize = n <= 6 ? 15 : n <= 8 ? 13.5 : n <= 12 ? 12 : 14

  return (
    <div className="wheel">
      <div className="wheel__pointer" ref={pointer} aria-hidden="true">
        <svg viewBox="0 0 40 48" width="34" height="40">
          <path d="M20 46L4 10a16 16 0 1132 0z" fill="#f4f1ea" />
          <circle cx="20" cy="16" r="5" fill="#1c1c1e" />
        </svg>
      </div>
      <motion.svg className="wheel__disc" viewBox={`${-R - 8} ${-R - 8} ${2 * R + 16} ${2 * R + 16}`} style={{ rotate: rot }} aria-hidden="true">
        <circle r={R + 6} fill="#151517" />
        {labels.map((label, i) => {
          const a0 = ((i * a - 90) * Math.PI) / 180
          const a1 = (((i + 1) * a - 90) * Math.PI) / 180
          const large = a > 180 ? 1 : 0
          const d = `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`
          const mid = i * a + a / 2
          const text = budget ? shortLabel(label, budget) : String(i + 1)
          const isWin = winner === i
          // Sol yarıdaki yazılar ters durmasın: 180° çevrilip merkeze doğru hizalanır.
          const flip = budget > 0 && mid > 180
          return (
            <g key={i}>
              <path d={d} fill={colors[i].fill} stroke="#151517" strokeWidth="1.5" />
              {isWin && <path d={d} fill="#ffffff" opacity="0.18" className="wheel__win" />}
              <g transform={`rotate(${mid - 90})${flip ? ' rotate(180)' : ''}`}>
                <text
                  x={budget ? (flip ? -(R - 16) : R - 16) : R - 22}
                  y={0}
                  textAnchor={budget ? (flip ? 'start' : 'end') : 'middle'}
                  dominantBaseline="central"
                  fill={colors[i].text}
                  fontSize={fontSize}
                  fontWeight={600}
                  fontFamily="var(--font)"
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
          return <circle key={`peg${i}`} cx={(R + 1) * Math.cos(ang)} cy={(R + 1) * Math.sin(ang)} r={3} fill="#d9d2c3" />
        })}
        <circle r={26} fill="#1c1c1e" stroke="#3a3a3c" strokeWidth="2" />
        <circle r={8} fill="#f4f1ea" />
      </motion.svg>
      <p className="wheel__under" aria-hidden="true">
        {n > 0 && winner == null ? labels[pointerIdx] ?? '' : ' '}
      </p>
    </div>
  )
})
