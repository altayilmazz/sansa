import { cryptoRng, sample, type Rng } from '../random'

export const MIN_SIZE = 2
export const MAX_SIZE = 6

export interface Cell {
  mine: boolean
  open: boolean
}

export interface Game {
  size: number
  mines: number
  cells: Cell[]
  state: 'play' | 'boom' | 'clear'
  /** Patlayan kare. */
  boom: number | null
}

/** En az 1 mayın olur ve en az 1 güvenli kare kalır. */
export const maxMines = (size: number) => size * size - 1
export const clampMines = (size: number, mines: number) => Math.max(1, Math.min(maxMines(size), Math.round(mines)))
export const clampSize = (size: number) => Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(size)))

/** Mayınlar oyun başında, tüm karelerde eşit olasılıkla rastgele yerleştirilir. */
export function newGame(size: number, mines: number, rng: Rng = cryptoRng): Game {
  const s = clampSize(size)
  const m = clampMines(s, mines)
  const at = new Set(sample(Array.from({ length: s * s }, (_, i) => i), m, rng))
  return {
    size: s,
    mines: m,
    cells: Array.from({ length: s * s }, (_, i) => ({ mine: at.has(i), open: false })),
    state: 'play',
    boom: null,
  }
}

export const safeLeft = (g: Game) => g.cells.filter((c) => !c.mine && !c.open).length

/** Kareyi açar: mayınsa oyun biter, güvenliyse açılır; güvenli kare kalmadıysa oyun temiz biter. */
export function reveal(game: Game, i: number): Game {
  if (game.state !== 'play' || game.cells[i].open) return game
  if (game.cells[i].mine) {
    const cells = game.cells.map((c) => (c.mine ? { ...c, open: true } : c))
    return { ...game, cells, state: 'boom', boom: i }
  }
  const cells = game.cells.map((c, k) => (k === i ? { ...c, open: true } : c))
  const next = { ...game, cells }
  return safeLeft(next) === 0 ? { ...next, state: 'clear' } : next
}
