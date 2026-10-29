import { cryptoRng, type Rng } from '../random'

/**
 * Hızlı, rastgele hamleli satranç. Taşlar gerçek kurallarına göre hareket eder
 * (şah tehdidi, mat, pat dahil); rok ve en passant yoktur, piyon vezire terfi eder.
 * Karelerin dizini: satır * 8 + sütun, satır 0 = 8. sıra (siyahın tarafı).
 */
export type Color = 'w' | 'b'

export interface Move {
  from: number
  to: number
  /** Yakalanan taş (boşsa ''). */
  capture: string
}

export const START: string[] = [...'rnbqkbnr', ...'pppppppp', ...Array(32).fill(''), ...'PPPPPPPP', ...'RNBQKBNR']

const colorOf = (p: string): Color | null => (p === '' ? null : p === p.toUpperCase() ? 'w' : 'b')
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]]

const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8

/** `sq` karesi `by` rengi tarafından tehdit ediliyor mu? */
export function attacked(board: readonly string[], sq: number, by: Color): boolean {
  const r = Math.floor(sq / 8)
  const c = sq % 8
  const own = (p: string, kind: string) => p === (by === 'w' ? kind : kind.toLowerCase())
  // piyon: beyaz piyon yukarı (satır azalır) gider, bu yüzden hedefi bir alt satırdan tehdit eder
  const pr = by === 'w' ? r + 1 : r - 1
  for (const dc of [-1, 1]) if (inside(pr, c + dc) && own(board[pr * 8 + c + dc], 'P')) return true
  for (const [dr, dc] of KNIGHT) if (inside(r + dr, c + dc) && own(board[(r + dr) * 8 + c + dc], 'N')) return true
  for (const [dr, dc] of KING) if (inside(r + dr, c + dc) && own(board[(r + dr) * 8 + c + dc], 'K')) return true
  const slide = (dirs: number[][], kinds: string[]) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr
      let cc = c + dc
      while (inside(rr, cc)) {
        const p = board[rr * 8 + cc]
        if (p) {
          if (kinds.some((k) => own(p, k))) return true
          break
        }
        rr += dr
        cc += dc
      }
    }
    return false
  }
  return slide(DIAG, ['B', 'Q']) || slide(ORTHO, ['R', 'Q'])
}

function pseudoMoves(board: readonly string[], turn: Color): Move[] {
  const out: Move[] = []
  const push = (from: number, r: number, c: number) => {
    if (!inside(r, c)) return false
    const target = board[r * 8 + c]
    if (target && colorOf(target) === turn) return false
    out.push({ from, to: r * 8 + c, capture: target })
    return !target
  }
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq]
    if (!p || colorOf(p) !== turn) continue
    const r = Math.floor(sq / 8)
    const c = sq % 8
    const kind = p.toUpperCase()
    if (kind === 'P') {
      const dir = turn === 'w' ? -1 : 1
      const startRow = turn === 'w' ? 6 : 1
      if (inside(r + dir, c) && !board[(r + dir) * 8 + c]) {
        out.push({ from: sq, to: (r + dir) * 8 + c, capture: '' })
        if (r === startRow && !board[(r + 2 * dir) * 8 + c]) out.push({ from: sq, to: (r + 2 * dir) * 8 + c, capture: '' })
      }
      for (const dc of [-1, 1]) {
        if (!inside(r + dir, c + dc)) continue
        const t = board[(r + dir) * 8 + c + dc]
        if (t && colorOf(t) !== turn) out.push({ from: sq, to: (r + dir) * 8 + c + dc, capture: t })
      }
    } else if (kind === 'N') {
      for (const [dr, dc] of KNIGHT) push(sq, r + dr, c + dc)
    } else if (kind === 'K') {
      for (const [dr, dc] of KING) push(sq, r + dr, c + dc)
    } else {
      const dirs = kind === 'B' ? DIAG : kind === 'R' ? ORTHO : [...DIAG, ...ORTHO]
      for (const [dr, dc] of dirs) {
        let rr = r + dr
        let cc = c + dc
        while (push(sq, rr, cc)) {
          rr += dr
          cc += dc
        }
      }
    }
  }
  return out
}

/** Hamleyi uygular (yeni dizi döner); piyon son sıraya ulaşınca vezir olur. */
export function applyMove(board: readonly string[], m: Move): string[] {
  const next = board.slice()
  let p = next[m.from]
  const row = Math.floor(m.to / 8)
  if (p === 'P' && row === 0) p = 'Q'
  if (p === 'p' && row === 7) p = 'q'
  next[m.to] = p
  next[m.from] = ''
  return next
}

const kingSquare = (board: readonly string[], color: Color) => board.indexOf(color === 'w' ? 'K' : 'k')
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

export function inCheck(board: readonly string[], color: Color) {
  return attacked(board, kingSquare(board, color), other(color))
}

/** Şahı açıkta bırakmayan tüm yasal hamleler. */
export function legalMoves(board: readonly string[], turn: Color): Move[] {
  return pseudoMoves(board, turn).filter((m) => !inCheck(applyMove(board, m), turn))
}

/** Hiçbir tarafın mat edemeyeceği malzeme: şah–şah, şah+fil/at – şah. */
export function insufficient(board: readonly string[]): boolean {
  const rest = board.filter((p) => p && p.toUpperCase() !== 'K').map((p) => p.toUpperCase())
  return rest.length === 0 || (rest.length === 1 && (rest[0] === 'B' || rest[0] === 'N'))
}

export interface Game {
  moves: Move[]
  /** Her hamleden önceki + son konum (moves.length + 1 adet). */
  boards: string[][]
  result: Color | 'draw'
}

/** Baştan sona, her sırada yasal hamlelerden eşit olasılıkla birini seçerek oynar. */
export function playRandomGame(rng: Rng = cryptoRng, maxPlies = 400): Game {
  let board = START.slice()
  let turn: Color = 'w'
  const moves: Move[] = []
  const boards = [board]
  for (let ply = 0; ply < maxPlies; ply++) {
    const legal = legalMoves(board, turn)
    if (legal.length === 0) return { moves, boards, result: inCheck(board, turn) ? other(turn) : 'draw' }
    if (insufficient(board)) return { moves, boards, result: 'draw' }
    const m = legal[rng.int(legal.length)]
    board = applyMove(board, m)
    moves.push(m)
    boards.push(board)
    turn = other(turn)
  }
  return { moves, boards, result: 'draw' }
}

/** Taş sayısı (perft testi için). */
export function perft(board: readonly string[], turn: Color, depth: number): number {
  if (depth === 0) return 1
  let n = 0
  for (const m of legalMoves(board, turn)) n += perft(applyMove(board, m), other(turn), depth - 1)
  return n
}
