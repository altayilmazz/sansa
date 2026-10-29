import { animate, useMotionValue, useMotionValueEvent } from 'motion/react'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from '../state/hooks'
import { TOOL_ORDER, TOOLS, type ToolId } from '../state/tools'

/** Görünen yuva sayısı; kalan araçlar şeridin dışında bekler ve kaydırınca girer. */
export const SLOTS = 6

const mod = (n: number, m: number) => ((n % m) + m) % m

/** Ana ekran ızgarasından seçilen araç, dokunulduğu yatay konumdaki yuvaya yerleşir. */
let wanted: { id: ToolId; slot: number } | null = null
export function wantSlot(id: ToolId, x: number, width: number) {
  wanted = { id, slot: Math.max(0, Math.min(SLOTS - 1, Math.floor((x / Math.max(1, width)) * SLOTS))) }
}

/** Seçili araç görünen yuvalardan birinde durmalıdır; değilse halka döndürülür. */
function normalize(ring: ToolId[], selected: ToolId): ToolId[] {
  const at = ring.indexOf(selected)
  if (wanted && wanted.id === selected && at !== wanted.slot) {
    const shift = at - wanted.slot
    return ring.map((_, i) => ring[mod(i + shift, ring.length)])
  }
  if (at >= 0 && at < SLOTS) return ring
  const shift = at < 0 ? 0 : at - (SLOTS - 1)
  return ring.map((_, i) => ring[(i + shift) % ring.length])
}

/**
 * Seçili sekmenin yatay konumu (yuva) sabit kalır; öteki araçlar sonsuz bir halka
 * olarak seçili yuvanın üstünden atlayarak kayar. Kaydırma bırakılınca en yakın
 * yuvaya oturur ve seçili araç, o an denk geldiği aralığa halkada yerleşir.
 */
export function useRing(selected: ToolId | null) {
  const [ring, setRing] = useState<ToolId[]>(() => [...TOOL_ORDER])
  if (!selected) wanted = null
  const sel = selected ?? TOOL_ORDER[0]
  const norm = normalize(ring, sel)
  if (norm !== ring) setRing(norm)
  return { ring: norm, setRing, pin: norm.indexOf(sel) }
}

export function TabStrip({ selected, ring, setRing, render }: { selected: ToolId; ring: ToolId[]; setRing: (r: ToolId[]) => void; render: (id: ToolId, pinned: boolean) => ReactNode }) {
  const reduced = useReducedMotion()
  const pin = ring.indexOf(selected)
  const others = ring.filter((t) => t !== selected)
  const count = others.length

  const offset = useMotionValue(0)
  const [off, setOff] = useState(0)
  useMotionValueEvent(offset, 'change', setOff)

  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x0: number; off0: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null)
  const suppress = useRef(false)
  const anim = useRef<{ stop: () => void } | null>(null)
  const token = useRef(0)

  const slotW = () => (box.current?.clientWidth ?? 360) / SLOTS

  /** Dururken görünen düzeni halkaya yazar ve kaydırmayı sıfırlar. */
  const commit = (k: number) => {
    const row: ToolId[] = []
    let c = 0
    for (let j = 0; j < SLOTS; j++) row.push(j === pin ? selected : others[mod(k + c++, count)])
    const hidden = Array.from({ length: count - (SLOTS - 1) }, (_, c) => others[mod(k + SLOTS - 1 + c, count)])
    setRing([...row, ...hidden])
    offset.set(0)
  }

  const settle = (target: number) => {
    const my = ++token.current
    if (reduced) {
      offset.set(target)
      commit(mod(target, count))
      return
    }
    anim.current = animate(offset, target, {
      type: 'spring',
      stiffness: 260,
      damping: 32,
      onComplete: () => {
        if (token.current === my) commit(mod(target, count))
      },
    })
  }

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Süren bir kayma varsa tutulduğu yerden devam eder.
    token.current++
    anim.current?.stop()
    drag.current = { id: e.pointerId, x0: e.clientX, off0: offset.get(), moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x0
    if (!d.moved) {
      if (Math.abs(dx) < 7) return
      d.moved = true
      suppress.current = true
      box.current?.setPointerCapture(e.pointerId)
    }
    const now = performance.now()
    const dt = Math.max(1, now - d.lastT)
    d.v = d.v * 0.6 + (((e.clientX - d.lastX) / dt) * 1000) * 0.4
    d.lastX = e.clientX
    d.lastT = now
    offset.set(d.off0 - dx / slotW())
  }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) return
    const cur = offset.get()
    // Hız (yuva/sn) biraz ileri taşır; en fazla 5 yuva.
    const carry = Math.max(-5, Math.min(5, (-d.v / slotW()) * 0.22))
    settle(Math.round(cur + carry))
    setTimeout(() => (suppress.current = false), 0)
  }

  /** t: seçili yuvayı atlayan görsel konum (yuva birimiyle). */
  const place = (t: number) => (t <= pin - 1 ? t : t < pin ? pin - 1 + 2 * (t - pin + 1) : t + 1)

  return (
    <div
      ref={box}
      className="strip"
      role="group"
      aria-label="Araçlar"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClickCapture={(e) => {
        if (suppress.current) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        // Süren bir kayma sırasında dokunulursa görünen düzen halkaya yazılır; yoksa
        // seçilen araç görünmeyen bir halka konumuna denk gelip en sağa atlar.
        const cur = offset.get()
        if (cur !== 0) {
          token.current++
          anim.current?.stop()
          commit(mod(Math.round(cur), count))
        }
      }}
    >
      {others.map((id, i) => {
        const t = mod(i - off + 1, count) - 1
        const x = place(t)
        const hidden = x < -0.6 || x > SLOTS - 0.4
        return (
          <div
            key={id}
            className="strip__slot"
            style={{ transform: `translateX(${x * 100}%)`, '--tint': TOOLS[id].tint } as CSSProperties}
            // Görünmeyen sekmelere klavyeyle gidilemez.
            {...(hidden ? { inert: true } : {})}
          >
            {render(id, false)}
          </div>
        )
      })}
      <div className={`strip__slot is-pin${pin === 0 ? ' pin-l' : pin === SLOTS - 1 ? ' pin-r' : ''}`} style={{ transform: `translateX(${pin * 100}%)`, '--tint': TOOLS[selected].tint } as CSSProperties}>
        {render(selected, true)}
      </div>
    </div>
  )
}
