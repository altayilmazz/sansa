import { cryptoRng, type Rng } from '../random'
import type { RoundOutcome } from './match'

export type Face = 'yazi' | 'tura'

export const FACE_LABEL: Record<Face, string> = { yazi: 'Yazı', tura: 'Tura' }

export function flip(rng: Rng = cryptoRng): Face {
  return rng.int(2) === 0 ? 'yazi' : 'tura'
}

/** A oyuncusu aSide yüzünü seçmiştir, B diğer yüzü. Yazı turada beraberlik olmaz. */
export function coinOutcome(face: Face, aSide: Face): RoundOutcome {
  return face === aSide ? 'a' : 'b'
}

export function otherFace(f: Face): Face {
  return f === 'yazi' ? 'tura' : 'yazi'
}
