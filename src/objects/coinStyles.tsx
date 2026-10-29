import type { CSSProperties } from 'react'
import { SquirrelEmblem } from './Squirrel'

/** Paranın yüz renkleri: dört duraklı ışık geçişi, iki kenar halkası ve yazı rengi. */
export interface CoinTone {
  id: string
  name: string
  stops: [string, string, string, string]
  rim: string
  rim2: string
  ink: string
}

export const TONES: CoinTone[] = [
  { id: 'altin', name: 'Altın', stops: ['#ffe7a3', '#e3b341', '#b9871f', '#8a6416'], rim: '#c89a2c', rim2: '#9a7420', ink: '#7a5414' },
  { id: 'gumus', name: 'Gümüş', stops: ['#f4f8fc', '#c6d2de', '#8c9db0', '#5d6c7d'], rim: '#a9b8c8', rim2: '#66778a', ink: '#2d3b4d' },
  { id: 'bakir', name: 'Bakır', stops: ['#ffd9c2', '#e39a6a', '#b8683a', '#7d4122'], rim: '#c9784a', rim2: '#8f4f2b', ink: '#5e2f14' },
  { id: 'zumrut', name: 'Zümrüt', stops: ['#c9f2dc', '#58c08a', '#2d8a5e', '#185a3c'], rim: '#3fa774', rim2: '#1f6e48', ink: '#0f3a26' },
  { id: 'safir', name: 'Safir', stops: ['#cfe0ff', '#6c9bf0', '#3a67c2', '#223f7d'], rim: '#4f7fd6', rim2: '#2b4f99', ink: '#142b5c' },
  { id: 'gul', name: 'Gül', stops: ['#ffd6e3', '#f08aaa', '#c24f78', '#7d2c4c'], rim: '#d2688c', rim2: '#8f3a59', ink: '#5a1b33' },
]

type Theme = 'light' | 'dark' | 'special'

/** "Sistem" tonu: uygulamanın temasına uyar (koyu: gri, açık: mavi-gri, Claude: turuncu-krem). */
const SYSTEM: Record<Theme, { yazi: CoinTone; tura: CoinTone }> = {
  dark: {
    yazi: { id: 'sistem', name: 'Sistem', stops: ['#f2f2f7', '#c7c7cc', '#8e8e93', '#48484a'], rim: '#a1a1a6', rim2: '#636366', ink: '#2c2c2e' },
    tura: { id: 'sistem', name: 'Sistem', stops: ['#8e8e93', '#636366', '#3a3a3c', '#1c1c1e'], rim: '#636366', rim2: '#2c2c2e', ink: '#d1d1d6' },
  },
  light: {
    yazi: { id: 'sistem', name: 'Sistem', stops: ['#dbe7ff', '#7ea6f5', '#3f6fd8', '#1e3f94'], rim: '#4f7fe0', rim2: '#274aa6', ink: '#102a6b' },
    tura: { id: 'sistem', name: 'Sistem', stops: ['#ffffff', '#e3e7ef', '#b9c1d1', '#8a93a6'], rim: '#c3cad8', rim2: '#8892a6', ink: '#3a4458' },
  },
  special: {
    yazi: { id: 'sistem', name: 'Sistem', stops: ['#ffd8c4', '#e8a083', '#d97757', '#a8482e'], rim: '#d97757', rim2: '#a8482e', ink: '#6e2a14' },
    tura: { id: 'sistem', name: 'Sistem', stops: ['#fffdf7', '#f1ead9', '#d6cbb0', '#a89c7e'], rim: '#d8cdb2', rim2: '#a89c7e', ink: '#4a4437' },
  },
}

export const toneById = (id: string, theme: Theme = 'dark', role: 'yazi' | 'tura' = 'yazi'): CoinTone =>
  id === 'sistem' ? SYSTEM[theme][role] : (TONES.find((t) => t.id === id) ?? TONES[0])
/** Seçenek listesi: önce temaya uyan "Sistem", sonra sabit renkler. */
export const tonesFor = (theme: Theme, role: 'yazi' | 'tura'): CoinTone[] => [SYSTEM[theme][role], ...TONES]
export const isToneId = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && TONES.some((t) => t.id === v))

/** Düğmelerdeki küçük renk örneği için aynı ışık geçişi. */
export const toneGradient = (t: CoinTone) => `radial-gradient(circle at 34% 28%, ${t.stops[0]} 0%, ${t.stops[1]} 38%, ${t.stops[2]} 78%, ${t.stops[3]} 100%)`

/** Para yüzünün CSS değişkenleri; önek y (yazı) ya da t (tura). */
export function toneVars(prefix: 'y' | 't', t: CoinTone): CSSProperties {
  return {
    [`--${prefix}1`]: t.stops[0],
    [`--${prefix}2`]: t.stops[1],
    [`--${prefix}3`]: t.stops[2],
    [`--${prefix}4`]: t.stops[3],
    [`--${prefix}r1`]: t.rim,
    [`--${prefix}r2`]: t.rim2,
    [`--${prefix}ink`]: t.ink,
  } as CSSProperties
}

export type SymbolId = 'sincap' | 'yildiz' | 'tac' | 'simsek' | 'yaprak'
export const SYMBOLS: { id: SymbolId; name: string }[] = [
  { id: 'sincap', name: 'Sincap' },
  { id: 'yildiz', name: 'Yıldız' },
  { id: 'tac', name: 'Taç' },
  { id: 'simsek', name: 'Şimşek' },
  { id: 'yaprak', name: 'Yaprak' },
]
export const symbolName = (id: SymbolId) => SYMBOLS.find((s) => s.id === id)?.name ?? 'Sincap'
export const isSymbolId = (v: unknown): v is SymbolId => typeof v === 'string' && SYMBOLS.some((s) => s.id === v)

/** Tura yüzündeki sembol. Hepsi aynı 64 birimlik kutuda, tek renkli çizilir. */
export function CoinSymbol({ id, size = 48, color = 'currentColor' }: { id: SymbolId; size?: number; color?: string }) {
  if (id === 'sincap') return <SquirrelEmblem size={size} color={color} />
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill={color}>
        {id === 'yildiz' && <path d="M32 6l7.6 17.2 18.6 1.8-14 12.4 4.1 18.3L32 45.8 15.7 55.7l4.1-18.3-14-12.4 18.6-1.8z" />}
        {id === 'tac' && (
          <>
            <path d="M8 44V20l13 12 11-17 11 17 13-12v24z" />
            <rect x="8" y="48" width="48" height="7" rx="2" />
          </>
        )}
        {id === 'simsek' && <path d="M37 5L13 36h15l-5 23 28-33H36z" />}
        {id === 'yaprak' && (
          <>
            <path d="M10 54C10 28 27 10 54 10c0 27-18 44-44 44z" />
            <path d="M10 54L36 28" stroke="var(--vein, #00000040)" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        )}
      </g>
    </svg>
  )
}
