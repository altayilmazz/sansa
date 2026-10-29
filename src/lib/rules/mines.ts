import { cryptoRng, sample, type Rng } from '../random'

export interface MineLevel {
  id: 'kolay' | 'orta' | 'zor'
  name: string
  rows: number
  cols: number
  mines: number
}

export const LEVELS: MineLevel[] = [
  { id: 'kolay', name: 'Kolay', rows: 8, cols: 8, mines: 10 },
  { id: 'orta', name: 'Orta', rows: 10, cols: 8, mines: 16 },
  { id: 'zor', name: 'Zor', rows: 12, cols: 8, mines: 26 },
]

export interface Cell {
  mine: boolean
  /** Çevredeki mayın sayısı. */
  n: number
  open: boolean
  flag: boolean
}

export interface Game {
  rows: number
  cols: number
  mines: number
  cells: Cell[]
  /** Mayınlar ilk açılışta yerleştirilir; ilk dokunuş hiçbir zaman mayına denk gelmez. */
  placed: boolean
  state: 'play' | 'won' | 'lost'
  /** Kaybettiren hücre. */
  boom: number | null
}

export function newGame(level: Pick<MineLevel, 'rows' | 'cols' | 'mines'>): Game {
  return {
    rows: level.rows,
    cols: level.cols,
    mines: level.mines,
    cells: Array.from({ length: level.rows * level.cols }, () => ({ mine: false, n: 0, open: false, flag: false })),
    placed: false,
    state: 'play',
    boom: null,
  }
}

export function neighbors(g: Pick<Game, 'rows' | 'cols'>, i: number): number[] {
  const r = Math.floor(i / g.cols)
  const c = i % g.cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < g.rows && cc >= 0 && cc < g.cols) out.push(rr * g.cols + cc)
    }
  }
  return out
}

/** İlk dokunulan hücre ve çevresi mayınsız kalır (yer yetmezse yalnızca hücrenin kendisi). */
function place(g: Game, first: number, rng: Rng): Game {
  const total = g.rows * g.cols
  const ring = new Set([first, ...neighbors(g, first)])
  let pool = Array.from({ length: total }, (_, i) => i).filter((i) => !ring.has(i))
  if (pool.length < g.mines) pool = Array.from({ length: total }, (_, i) => i).filter((i) => i !== first)
  const mineAt = new Set(sample(pool, g.mines, rng))
  const cells = g.cells.map((c, i) => ({ ...c, mine: mineAt.has(i) }))
  for (let i = 0; i < total; i++) {
    cells[i].n = neighbors(g, i).filter((j) => cells[j].mine).length
  }
  return { ...g, cells, placed: true }
}

/** Bir hücreyi açar; sıfır olan hücrelerde komşular zincirleme açılır. */
export function reveal(game: Game, i: number, rng: Rng = cryptoRng): Game {
  if (game.state !== 'play') return game
  let g = game
  if (g.cells[i].open || g.cells[i].flag) return g
  if (!g.placed) g = place(g, i, rng)
  const cells = g.cells.map((c) => ({ ...c }))
  if (cells[i].mine) {
    cells.forEach((c) => {
      if (c.mine) c.open = true
    })
    return { ...g, cells, state: 'lost', boom: i }
  }
  const stack = [i]
  while (stack.length) {
    const k = stack.pop() as number
    const c = cells[k]
    if (c.open || c.flag) continue
    c.open = true
    if (c.n === 0) stack.push(...neighbors(g, k))
  }
  const safeLeft = cells.filter((c) => !c.mine && !c.open).length
  if (safeLeft === 0) {
    cells.forEach((c) => {
      if (c.mine) c.flag = true
    })
    return { ...g, cells, state: 'won' }
  }
  return { ...g, cells }
}

export function toggleFlag(game: Game, i: number): Game {
  if (game.state !== 'play' || game.cells[i].open) return game
  const cells = game.cells.map((c, k) => (k === i ? { ...c, flag: !c.flag } : c))
  return { ...game, cells }
}

export const flagsLeft = (g: Game) => g.mines - g.cells.filter((c) => c.flag).length
