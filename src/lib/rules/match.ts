/** İki kişilik karşılaşmaların ortak skor mantığı. */
export type Side = 'a' | 'b'
export type RoundOutcome = Side | 'berabere'
export type MatchFormat = 'tek' | 'ucte-iki'

export function winsNeeded(format: MatchFormat): number {
  return format === 'tek' ? 1 : 2
}

export interface Score {
  a: number
  b: number
}

export function addRound(score: Score, outcome: RoundOutcome): Score {
  if (outcome === 'berabere') return score
  return { ...score, [outcome]: score[outcome] + 1 }
}

export function matchWinner(score: Score, format: MatchFormat): Side | null {
  const need = winsNeeded(format)
  if (score.a >= need) return 'a'
  if (score.b >= need) return 'b'
  return null
}

export function cleanPlayerName(raw: string, fallback: string): string {
  const s = raw.replace(/\s+/g, ' ').trim()
  return s.length ? s : fallback
}
