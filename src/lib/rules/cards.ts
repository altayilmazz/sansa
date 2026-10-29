import { cryptoRng, shuffle, type Rng } from '../random'
import type { RoundOutcome } from './match'

export type Suit = 'maca' | 'kupa' | 'karo' | 'sinek'
/** 2..14; 11 Vale, 12 Kız, 13 Papaz, 14 As. */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  suit: Suit
  rank: Rank
  id: string
}

export const SUITS: Suit[] = ['maca', 'kupa', 'karo', 'sinek']
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const SUIT_NAME: Record<Suit, string> = { maca: 'Maça', kupa: 'Kupa', karo: 'Karo', sinek: 'Sinek' }
export const isRed = (s: Suit) => s === 'kupa' || s === 'karo'

const FACE_SHORT = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as const
const FACE_NAME = { 11: 'Vale', 12: 'Kız', 13: 'Papaz', 14: 'As' } as const

export function rankShort(r: Rank): string {
  return r <= 10 ? String(r) : FACE_SHORT[r as keyof typeof FACE_SHORT]
}
export function rankName(r: Rank): string {
  return r <= 10 ? String(r) : FACE_NAME[r as keyof typeof FACE_NAME]
}
export const cardName = (c: Card) => `${SUIT_NAME[c.suit]} ${rankName(c.rank)}`

/** Jokersiz standart 52 kartlık deste. */
export function fullDeck(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank, id: `${suit}-${rank}` })))
}

/** Karıştırılmış deste. Çekilen kart desteden çıkar; deste sıfırlanana dek tekrar etmez. */
export class Deck {
  private cards: Card[]
  private rng: Rng
  constructor(rng: Rng = cryptoRng, cards?: Card[]) {
    this.rng = rng
    this.cards = cards ? cards.slice() : shuffle(fullDeck(), rng)
  }
  get remaining(): number {
    return this.cards.length
  }
  /** Destenin üstündeki n kart (görüntüleme için), çekmeden. */
  peekTop(n: number): readonly Card[] {
    return this.cards.slice(0, n)
  }
  /** Üstteki kartlardan i. konumdakini çeker. Sıra önceden karıştırılmıştır. */
  drawAt(i: number): Card {
    if (!Number.isInteger(i) || i < 0 || i >= this.cards.length) throw new RangeError('Destede bu konumda kart yok.')
    return this.cards.splice(i, 1)[0]
  }
  draw(): Card {
    return this.drawAt(0)
  }
  /** Kalan kartları yeniden karıştırır. */
  shuffle(): void {
    this.cards = shuffle(this.cards, this.rng)
  }
  /** 52 kartı geri koyar ve karıştırır. */
  reset(): void {
    this.cards = shuffle(fullDeck(), this.rng)
  }
  snapshot(): Card[] {
    return this.cards.slice()
  }
}

/** Yüksek kart kazanır; türler arasında üstünlük yoktur, aynı değer beraberliktir. */
export function cardOutcome(a: Card, b: Card): RoundOutcome {
  return a.rank === b.rank ? 'berabere' : a.rank > b.rank ? 'a' : 'b'
}
