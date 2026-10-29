import { motion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Card } from '../lib/rules/cards'
import { CardBack } from './PlayingCard'

/**
 * Kapalı kartlardan oluşan yelpaze. Masaüstünde üzerine gelince kartlar
 * kalkar; tıklayarak ya da yukarı fırlatarak bir kart oynanır. Kartların
 * kimliği DOM'a yazılmaz; yalnızca konumları gösterilir.
 */
export function CardFan({
  cards,
  onPlay,
  disabled,
  reduced,
}: {
  cards: readonly Card[]
  onPlay: (index: number) => void
  disabled?: boolean
  reduced: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const dragged = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  // Kart genişliği CSS değişkeninden (--cw) okunur; pencere boyutu değişince yenilenir.
  const [step, setStep] = useState(36)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const read = () => setStep((parseFloat(getComputedStyle(el).getPropertyValue('--cw')) || 86) * 0.42)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = cards.length

  return (
    <div ref={root} className={`fan${disabled ? ' is-disabled' : ''}`} role="group" aria-label={`Kapalı kartlar, ${n} kart`} onPointerLeave={() => setHover(null)}>
      {cards.map((c, i) => {
        const t = i - (n - 1) / 2
        const near = hover === null ? 0 : i === hover ? 0 : i < hover ? -1 : 1
        const lift = hover === i ? -30 : 0
        return (
          <motion.button
            key={c.id}
            layoutId={reduced ? undefined : `card-${c.id}`}
            type="button"
            className="fan__card pcard"
            style={{ zIndex: i, '--t': t } as CSSProperties}
            initial={false}
            animate={{
              rotate: t * 6.5,
              x: t * step + near * 14,
              y: Math.abs(t) * Math.abs(t) * 2.6 + lift,
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            disabled={disabled}
            aria-label={`${i + 1}. kapalı kartı çek`}
            onHoverStart={() => !disabled && setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            drag={disabled || reduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.55}
            dragSnapToOrigin
            onDragStart={() => {
              dragged.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50 || info.velocity.y < -350) onPlay(i)
              setTimeout(() => (dragged.current = false), 0)
            }}
            onClick={() => {
              if (dragged.current) return
              onPlay(i)
            }}
          >
            <CardBack />
          </motion.button>
        )
      })}
    </div>
  )
}
