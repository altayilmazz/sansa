import { useAnimate } from 'motion/react'
import { forwardRef, useImperativeHandle, useMemo, useRef, type CSSProperties } from 'react'
import type { DieValue } from '../lib/rules/dice'

export interface DieHandle {
  roll(value: DieValue, opts: { reduced: boolean; delay?: number; from?: -1 | 1 }): Promise<void>
}

/** Pip konumları 3×3 ızgarada (0..8). */
const PIPS: Record<DieValue, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

/** Küp yüzleri: değer → yüzü öne getiren küp dönüşü. */
const ORIENT: Record<DieValue, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: -90 },
  5: { x: 0, y: 90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
}
/** Yüzün küp üzerindeki yerleşimi (ORIENT ile tutarlı). */
const PLACE: Record<DieValue, string> = {
  1: 'rotateY(0deg)',
  6: 'rotateY(180deg)',
  2: 'rotateY(90deg)',
  5: 'rotateY(-90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
}

const mod = (x: number, m: number) => ((x % m) + m) % m

/*
 * Yuvarlak köşeli zar: altı düz yüz, on iki kenarda ikişer dilimli çeyrek silindir
 * ve sekiz köşede dörder üçgenden oluşan küre dilimi. Parçaların ortak kenarları
 * aynı noktalardan geçtiği için aralarında boşluk kalmaz. Her parça küp merkezine
 * göre `matrix3d` ile yerleştirilir. Seçilen R yarıçapında dilim hatası bir pikselin altındadır.
 */
type V = [number, number, number]
const vadd = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const vsub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const vmul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k]
const vdot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const vcross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const vnorm = (a: V): V => vmul(a, 1 / Math.hypot(a[0], a[1], a[2]))
const r3 = (n: number) => Math.round(n * 1000) / 1000

/** Yüz rengi ile köşe rengi arasında yumuşak geçiş (t: 0 = yüz, 1 = çapraz). */
/** Yüz ile derin ton arasındaki geçiş; renkler --die-face ve --die-deep değişkenlerinden gelir. */
function shade(normal: V): string {
  const maxc = Math.max(Math.abs(normal[0]), Math.abs(normal[1]), Math.abs(normal[2]))
  const t = Math.min(1, Math.max(0, (1 - maxc) / (1 - 1 / Math.sqrt(3))))
  return `color-mix(in srgb, var(--die-face, #f3eee2) ${Math.round((1 - t) * 100)}%, var(--die-deep, #e5decd))`
}

interface Piece {
  key: string
  style: CSSProperties
}

/** Merkezi c, genişlik yönü u, dış normali n olan w×h bir düzlem parçası. */
function place(c: V, u: V, n: V, w: number, h: number, clip?: string): CSSProperties {
  const v = vcross(n, u) // u × v = n: parçanın ön yüzü dışarı bakar
  const m = [...u, 0, ...v, 0, ...n, 0, ...c, 1].map(r3).join(',')
  return { width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: `matrix3d(${m})`, clipPath: clip, background: shade(n) }
}

// Parçalar birbirinin üzerine taşmaz; birleşim çizgilerinin ardında krem renkli çekirdek görünür.
const OVERLAP = 0

/** Üç noktalı üçgen parça; dış yön K merkezine göre belirlenir. */
function triangle(key: string, p: [V, V, V], K: V): Piece {
  const C = vmul(vadd(vadd(p[0], p[1]), p[2]), 1 / 3)
  let n = vnorm(vcross(vsub(p[1], p[0]), vsub(p[2], p[0])))
  if (vdot(n, vsub(C, K)) < 0) n = vmul(n, -1)
  const u = vnorm(vsub(p[1], p[0]))
  const v = vcross(n, u)
  const reach = Math.max(...p.map((q) => Math.hypot(...vsub(q, C))))
  const w = reach * 2 + 2
  const grow = 1.03
  const pts = p.map((q) => {
    const d = vsub(q, C)
    return `${r3(w / 2 + vdot(d, u) * grow)}px ${r3(w / 2 + vdot(d, v) * grow)}px`
  })
  return { key, style: place(C, u, n, w, w, `polygon(${pts.join(',')})`) }
}

function buildPieces(size: number, R: number): Piece[] {
  const H = size / 2
  const c0 = H - R // yuvarlak kenar/köşelerin merkez kaydırması
  const E: V[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  const signs = [-1, 1]
  const out: Piece[] = []

  // 12 kenar: her biri iki dilimli çeyrek silindir (22,5° + 22,5° → toplam 45°+45°)
  const half = Math.PI / 4 // tek dilimin açısı (çeyrek 90° / 2)
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const k = 3 - i - j
      for (const si of signs) {
        for (const sj of signs) {
          const n1 = vmul(E[i], si)
          const n2 = vmul(E[j], sj)
          const axis = vmul(vadd(n1, n2), c0)
          for (let s = 0; s < 2; s++) {
            const phi = s * half + half / 2 // dilimin orta açısı
            const n = vadd(vmul(n1, Math.cos(phi)), vmul(n2, Math.sin(phi)))
            const center = vadd(axis, vmul(n, R * Math.cos(half / 2)))
            const width = 2 * R * Math.sin(half / 2) + OVERLAP * 2
            out.push({ key: `e${i}${j}${si}${sj}${s}`, style: place(center, E[k], n, size - 2 * R + OVERLAP * 2, width) })
          }
        }
      }
    }
  }

  // 8 köşe: küre sekizlisi, 3 köşe + 3 kenar ortası noktasından 4 üçgen
  for (const s0 of signs) {
    for (const s1 of signs) {
      for (const s2 of signs) {
        const K: V = [c0 * s0, c0 * s1, c0 * s2]
        const a: V = [s0, 0, 0]
        const b: V = [0, s1, 0]
        const c: V = [0, 0, s2]
        const at = (d: V): V => vadd(K, vmul(vnorm(d), R))
        const A = at(a)
        const B = at(b)
        const Cc = at(c)
        const Mab = at(vadd(a, b))
        const Mbc = at(vadd(b, c))
        const Mca = at(vadd(c, a))
        const id = `${s0}${s1}${s2}`
        out.push(triangle(`k${id}a`, [A, Mab, Mca], K))
        out.push(triangle(`k${id}b`, [B, Mbc, Mab], K))
        out.push(triangle(`k${id}c`, [Cc, Mca, Mbc], K))
        out.push(triangle(`k${id}m`, [Mab, Mbc, Mca], K))
      }
    }
  }
  return out
}

export const Die = forwardRef<DieHandle, { size?: number; label?: string }>(function Die({ size = 96, label }, ref) {
  const [scope, animate] = useAnimate()
  const rot = useRef({ x: 0, y: 0 })
  const half = size / 2
  const radius = Math.round(size * 0.11 * 10) / 10
  const pieces = useMemo(() => buildPieces(size, radius), [size, radius])
  // İç çekirdek: parçaların birleşim çizgilerinin ardında siyah yerine krem rengi görünsün.
  // Yarıçapı, yuvarlak köşeden dışarı taşmayacak en büyük küp boyutudur.
  const core = half - radius + (radius - 1) / Math.sqrt(3) - 0.5

  useImperativeHandle(ref, () => ({
    async roll(value, { reduced, delay = 0, from = -1 }) {
      const cube = scope.current.querySelector('.die__cube') as HTMLElement
      const o = ORIENT[value]
      const cur = rot.current
      if (reduced) {
        const target = { x: o.x, y: o.y }
        await animate(cube, { opacity: [1, 0.25] }, { duration: 0.15, delay })
        cube.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg)`
        await animate(cube, { opacity: [0.25, 1] }, { duration: 0.15 })
        rot.current = target
        return
      }
      const target = {
        x: cur.x + 360 * 2 + mod(o.x - cur.x, 360),
        y: cur.y + 360 * 3 + mod(o.y - cur.y, 360),
      }
      const d = 1.05
      await Promise.all([
        animate(
          scope.current,
          { x: [from * size * 1.4, from * size * 0.5, from * size * 0.12, 0], y: [-size * 0.9, 0, -size * 0.28, 0] },
          { duration: d, delay, times: [0, 0.45, 0.72, 1], ease: ['easeIn', 'easeOut', 'easeIn'] },
        ),
        animate(cube, { rotateX: [cur.x, target.x], rotateY: [cur.y, target.y] }, { duration: d, delay, ease: [0.2, 0.6, 0.25, 1] }),
      ])
      // Son yönü açıkça yaz: görünen yüz her durumda sonuçla aynı kalır.
      cube.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg)`
      rot.current = target
    },
  }))

  const values = Object.keys(PIPS) as unknown as DieValue[]

  return (
    <div
      ref={scope}
      className="die"
      style={{ width: size, height: size, '--bevel': `${radius}px`, '--overlap': `${OVERLAP}px` } as CSSProperties}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <div className="die__shadow" />
      {/* Sabit hafif eğim: üst ve yan yüzler görünür, öndeki yüz okunaklı kalır. */}
      <div className="die__tilt">
        <div className="die__cube" style={{ transform: `rotateX(${rot.current.x}deg) rotateY(${rot.current.y}deg)` }}>
          {values.map((v) => (
            <div key={`core${v}`} className="die__core" style={{ inset: half - core, transform: `${PLACE[v]} translateZ(${core}px)` }} />
          ))}
          {values.map((v) => (
            <div key={v} className="die__face" style={{ transform: `${PLACE[v]} translateZ(${half}px)` }}>
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={`die__pip${PIPS[v].includes(i) ? ' is-on' : ''}${Number(v) === 1 ? ' is-ace' : ''}`} />
              ))}
            </div>
          ))}
          {pieces.map((p) => (
            <div key={p.key} className="die__piece" style={p.style} />
          ))}
        </div>
      </div>
    </div>
  )
})

export interface DiceColor {
  id: string
  name: string
  face: string
  deep: string
  pip: string
  ace: string
}

/** Zar renk seçenekleri; "Sistem" temaya göre ayrıca seçilir. */
export const DICE_COLORS: DiceColor[] = [
  { id: 'krem', name: 'Krem', face: '#f3eee2', deep: '#e5decd', pip: '#1c1c1e', ace: '#e5383b' },
  { id: 'beyaz', name: 'Beyaz', face: '#fafafa', deep: '#e4e4e8', pip: '#1c1c1e', ace: '#e5383b' },
  { id: 'siyah', name: 'Siyah', face: '#2a2a2d', deep: '#1c1c1e', pip: '#f4f1ea', ace: '#ff5a52' },
  { id: 'kirmizi', name: 'Kırmızı', face: '#d92d3a', deep: '#b3202c', pip: '#ffffff', ace: '#ffffff' },
  { id: 'mavi', name: 'Mavi', face: '#2f66e0', deep: '#2150b8', pip: '#ffffff', ace: '#ffd60a' },
  { id: 'yesil', name: 'Yeşil', face: '#2e9e5b', deep: '#237a46', pip: '#ffffff', ace: '#ffd60a' },
]
export const isDiceColor = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && DICE_COLORS.some((c) => c.id === v))

type DiceTheme = 'light' | 'dark' | 'special'
const DICE_SYSTEM: Record<DiceTheme, DiceColor> = {
  dark: { id: 'sistem', name: 'Sistem', face: '#d6d6da', deep: '#bdbdc2', pip: '#121214', ace: '#3a3a3c' },
  light: { id: 'sistem', name: 'Sistem', face: '#f5f7fb', deep: '#dfe4ee', pip: '#1d2433', ace: '#2563eb' },
  special: { id: 'sistem', name: 'Sistem', face: '#ece6d6', deep: '#d9d0b8', pip: '#262624', ace: '#d97757' },
}
export const diceColors = (theme: DiceTheme): DiceColor[] => [DICE_SYSTEM[theme], ...DICE_COLORS]
export const diceVars = (theme: DiceTheme, id: string): CSSProperties => {
  const c = id === 'sistem' ? DICE_SYSTEM[theme] : (DICE_COLORS.find((x) => x.id === id) ?? DICE_SYSTEM[theme])
  return { '--die-face': c.face, '--die-deep': c.deep, '--die-pip': c.pip, '--die-ace': c.ace } as CSSProperties
}
