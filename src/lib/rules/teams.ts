import { cryptoRng, shuffle, type Rng } from '../random'

export interface TeamPlan {
  ok: boolean
  error?: string
  /** Her takımın kişi sayısı, büyükten küçüğe. */
  sizes: number[]
  even: boolean
  /** Eşit dağılım mümkün değilse kullanıcıya sonuçtan önce gösterilecek açıklama. */
  note?: string
}

export const MIN_TEAMS = 2
export const MAX_TEAMS = 8

/** Sonuçtan önce dağılımın nasıl olacağını açıklar. */
export function planTeams(people: number, teams: number): TeamPlan {
  if (!Number.isInteger(teams) || teams < MIN_TEAMS || teams > MAX_TEAMS) {
    return { ok: false, error: `Takım sayısı ${MIN_TEAMS} ile ${MAX_TEAMS} arasında olmalı.`, sizes: [], even: false }
  }
  if (people < teams) {
    return {
      ok: false,
      error: `${teams} takım için en az ${teams} kişi gerekir. Şu an ${people} kişi var.`,
      sizes: [],
      even: false,
    }
  }
  const base = Math.floor(people / teams)
  const extra = people % teams
  const sizes = Array.from({ length: teams }, (_, i) => base + (i < extra ? 1 : 0))
  if (extra === 0) return { ok: true, sizes, even: true }
  const note =
    `${people} kişi ${teams} takıma tam eşit bölünemiyor: ` +
    `${extra} takım ${base + 1}, ${teams - extra} takım ${base} kişi olacak.`
  return { ok: true, sizes, even: false, note }
}

/**
 * Kişileri karıştırıp sırayla takımlara dağıtır. Her kişi tam bir kez yer alır,
 * takımlar arasındaki fark en fazla bir kişidir. Fazla kişi alan takımlar da
 * rastgele belirlenir.
 */
export function makeTeams<T>(people: readonly T[], teamCount: number, rng: Rng = cryptoRng): T[][] {
  const plan = planTeams(people.length, teamCount)
  if (!plan.ok) throw new RangeError(plan.error)
  const order = shuffle(people, rng)
  const teamOrder = shuffle(
    Array.from({ length: teamCount }, (_, i) => i),
    rng,
  )
  const teams: T[][] = Array.from({ length: teamCount }, () => [])
  order.forEach((p, i) => teams[teamOrder[i % teamCount]].push(p))
  return teams
}

export const TEAM_NAMES = ['Kırmızılar', 'Maviler', 'Yeşiller', 'Sarılar', 'Turuncular', 'Morlar', 'Beyazlar', 'Grililer']
