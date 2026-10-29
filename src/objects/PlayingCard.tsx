import type { CSSProperties } from 'react'
import { cardName, isRed, rankShort, type Card } from '../lib/rules/cards'
import { SuitIcon } from './Suit'

/** 2–10 için standart pip yerleşimi: [sütun 0..2, satır 0..6] */
const PIPS: Record<number, [number, number][]> = {
  2: [[1, 0], [1, 6]],
  3: [[1, 0], [1, 3], [1, 6]],
  4: [[0, 0], [2, 0], [0, 6], [2, 6]],
  5: [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]],
  6: [[0, 0], [2, 0], [0, 3], [2, 3], [0, 6], [2, 6]],
  7: [[0, 0], [2, 0], [1, 1.5], [0, 3], [2, 3], [0, 6], [2, 6]],
  8: [[0, 0], [2, 0], [1, 1.5], [0, 3], [2, 3], [1, 4.5], [0, 6], [2, 6]],
  9: [[0, 0], [2, 0], [0, 2], [2, 2], [1, 3], [0, 4], [2, 4], [0, 6], [2, 6]],
  10: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [0, 4], [2, 4], [1, 5], [0, 6], [2, 6]],
}

const COURT_LABEL: Record<number, string> = { 11: 'Vale', 12: 'Kız', 13: 'Papaz' }

export function CardFace({ card }: { card: Card }) {
  const red = isRed(card.suit)
  const short = rankShort(card.rank)
  return (
    <div className={`pcard__face${red ? ' is-red' : ''}`} role="img" aria-label={cardName(card)}>
      <span className="pcard__corner pcard__corner--tl" aria-hidden="true">
        <span className="pcard__rank">{short}</span>
        <SuitIcon suit={card.suit} className="pcard__csuit" />
      </span>
      <span className="pcard__corner pcard__corner--br" aria-hidden="true">
        <span className="pcard__rank">{short}</span>
        <SuitIcon suit={card.suit} className="pcard__csuit" />
      </span>
      <div className="pcard__center" aria-hidden="true">
        {card.rank === 14 ? (
          <SuitIcon suit={card.suit} className="pcard__ace" />
        ) : card.rank >= 11 ? (
          <div className="pcard__court">
            <span className="pcard__court-letter">{short}</span>
            <SuitIcon suit={card.suit} className="pcard__court-suit" />
            <span className="pcard__court-name">{COURT_LABEL[card.rank]}</span>
          </div>
        ) : (
          <div className="pcard__pips">
            {PIPS[card.rank].map(([c, r], i) => (
              <span key={i} className={`pcard__pip${r > 3 ? ' is-flipped' : ''}`} style={{ '--c': c, '--r': r } as CSSProperties}>
                <SuitIcon suit={card.suit} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function CardBack() {
  return (
    <div className="pcard__back" aria-hidden="true">
      <div className="pcard__back-inner">
        <span className="pcard__back-mark" />
      </div>
    </div>
  )
}

export interface CardBackColor {
  id: string
  name: string
  base: string
  frame: string
  line: string
}

/** Kart sırtı renk seçenekleri ("sistem" ayrıca temaya göre seçilir). */
export const CARD_BACKS: CardBackColor[] = [
  { id: 'beyaz', name: 'Beyaz', base: '#ececec', frame: '#ffffff', line: '#9a9a9a' },
  { id: 'siyah', name: 'Siyah', base: '#151517', frame: '#2c2c30', line: '#6a6a70' },
  { id: 'yesil', name: 'Yeşil', base: '#1f7a4d', frame: '#f4f1ea', line: '#d8f0e2' },
  { id: 'sari', name: 'Sarı', base: '#e0b100', frame: '#fbf7e8', line: '#7a5d00' },
  { id: 'mavi', name: 'Mavi', base: '#2b4fc4', frame: '#f4f1ea', line: '#cfd9ff' },
  { id: 'kirmizi', name: 'Kırmızı', base: '#c0262d', frame: '#f4f1ea', line: '#ffd9d9' },
  { id: 'mor', name: 'Mor', base: '#6b3fb0', frame: '#f4f1ea', line: '#e4d8ff' },
  { id: 'turuncu', name: 'Turuncu', base: '#e1741f', frame: '#f4f1ea', line: '#ffe3cc' },
  { id: 'kahverengi', name: 'Kahverengi', base: '#7a4a2b', frame: '#f4f1ea', line: '#f0d9c4' },
  { id: 'gri', name: 'Gri', base: '#7d7f86', frame: '#f4f1ea', line: '#e6e7ea' },
]
export const isBackId = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && CARD_BACKS.some((b) => b.id === v))

type Theme = 'light' | 'dark' | 'special'

/** Temaya göre ön yüz renkleri. */
const FACES: Record<Theme, { bg: string; ink: string; red: string; edge: string }> = {
  light: { bg: '#f8f5ee', ink: '#1c1c1e', red: '#d1202f', edge: 'rgba(0,0,0,0.08)' },
  dark: { bg: '#1c1c1e', ink: '#ecebe6', red: '#c9232d', edge: 'rgba(255,255,255,0.14)' },
  special: { bg: '#faf9f5', ink: '#3b3a36', red: '#d97757', edge: 'rgba(0,0,0,0.08)' },
}

/** "Sistem" sırtı: koyu temada siyah, Claude temasında turuncu, açık temada kırmızı ya da mavi. */
function systemBack(theme: Theme, blue: boolean): CardBackColor {
  if (theme === 'dark') return { id: 'sistem', name: 'Sistem', base: '#0e0e10', frame: '#2c2c30', line: '#5a5a60' }
  if (theme === 'special') return { id: 'sistem', name: 'Sistem', base: '#d97757', frame: '#faf9f5', line: '#fff0e8' }
  return { ...CARD_BACKS.find((b) => b.id === (blue ? 'mavi' : 'kirmizi'))!, id: 'sistem', name: 'Sistem' }
}

export const CARD_FACES = [
  { id: 'beyaz', name: 'Beyaz', bg: '#f8f5ee', edge: 'rgba(0,0,0,0.08)' },
  { id: 'siyah', name: 'Siyah', bg: '#1c1c1e', edge: 'rgba(255,255,255,0.14)' },
  { id: 'krem', name: 'Krem', bg: '#f1e4c8', edge: 'rgba(0,0,0,0.1)' },
  { id: 'gri', name: 'Gri', bg: '#d8d8dc', edge: 'rgba(0,0,0,0.1)' },
  { id: 'lacivert', name: 'Lacivert', bg: '#16213a', edge: 'rgba(255,255,255,0.16)' },
]
export const CARD_INKS = [
  { id: 'klasik', name: 'Klasik', ink: '#1c1c1e', red: '#d1202f' },
  { id: 'acik', name: 'Açık', ink: '#ecebe6', red: '#c9232d' },
  { id: 'claude', name: 'Claude', ink: '#3b3a36', red: '#d97757' },
  { id: 'mavi', name: 'Mavi-turuncu', ink: '#1d3a8a', red: '#e07a1f' },
  { id: 'yesil', name: 'Yeşil-kırmızı', ink: '#14532d', red: '#b91c1c' },
]
export const isFaceId = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && CARD_FACES.some((b) => b.id === v))
export const isInkId = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && CARD_INKS.some((b) => b.id === v))

/** Kart sahnesine uygulanan renk değişkenleri. */
export function cardVars(theme: Theme, back: string, blue: boolean, face = 'sistem', inks = 'sistem'): CSSProperties {
  const base = FACES[theme]
  const fo = CARD_FACES.find((x) => x.id === face)
  const io = CARD_INKS.find((x) => x.id === inks)
  const f = { bg: fo?.bg ?? base.bg, edge: fo?.edge ?? base.edge, ink: io?.ink ?? base.ink, red: io?.red ?? base.red }
  const b = back === 'sistem' ? systemBack(theme, blue) : (CARD_BACKS.find((x) => x.id === back) ?? systemBack(theme, blue))
  return {
    '--cf-bg': f.bg,
    '--cf-ink': f.ink,
    '--cf-red': f.red,
    '--cf-edge': f.edge,
    '--cb-base': b.base,
    '--cb-frame': b.frame,
    '--cb-line': b.line,
  } as CSSProperties
}
