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
        <span className="pcard__back-mark">Ş</span>
      </div>
    </div>
  )
}
