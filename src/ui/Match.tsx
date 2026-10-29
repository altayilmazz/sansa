import { motion } from 'motion/react'
import { useCallback, useId, useState, type ReactNode } from 'react'
import { addRound, cleanPlayerName, matchWinner, winsNeeded, type MatchFormat, type RoundOutcome, type Score, type Side } from '../lib/rules/match'
import { usePersistent } from '../state/store'
import { Row, Segmented } from './controls'

const isPlayers = (v: unknown): v is [string, string] => Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'string')
const isFormat = (v: unknown): v is MatchFormat => v === 'tek' || v === 'ucte-iki'

export const FALLBACK: [string, string] = ['1. oyuncu', '2. oyuncu']

/** Karşılaşma durumu: oyuncular, biçim, skor ve turlar. */
export function useMatch(storeKey: string) {
  const [rawNames, setRawNames] = usePersistent<[string, string]>(`${storeKey}:players`, ['', ''], isPlayers)
  const [format, setFormat] = usePersistent<MatchFormat>(`${storeKey}:format`, 'tek', isFormat)
  const [score, setScore] = useState<Score>({ a: 0, b: 0 })
  const [rounds, setRounds] = useState<RoundOutcome[]>([])
  const names: [string, string] = [cleanPlayerName(rawNames[0], FALLBACK[0]), cleanPlayerName(rawNames[1], FALLBACK[1])]
  const winner = matchWinner(score, format)
  const started = rounds.length > 0

  const push = useCallback(
    (o: RoundOutcome) => {
      const next = addRound(score, o)
      setScore(next)
      setRounds((r) => [...r, o])
      return { score: next, winner: matchWinner(next, format) }
    },
    [score, format],
  )
  const reset = useCallback(() => {
    setScore({ a: 0, b: 0 })
    setRounds([])
  }, [])

  return { rawNames, setRawNames, names, format, setFormat, score, rounds, winner, started, push, reset }
}
export type MatchState = ReturnType<typeof useMatch>

export function nameOf(m: MatchState, s: Side) {
  return s === 'a' ? m.names[0] : m.names[1]
}

export function PlayersForm({ match, disabled, sideLabels, extra }: { match: MatchState; disabled?: boolean; sideLabels?: [ReactNode, ReactNode]; extra?: ReactNode }) {
  const id = useId()
  return (
    <div className="players">
      <div className="players__grid">
        {[0, 1].map((i) => (
          <div key={i} className="players__field">
            <label htmlFor={`${id}-${i}`} className="editor__label">
              {i + 1}. oyuncu
            </label>
            <input
              id={`${id}-${i}`}
              className="field"
              value={match.rawNames[i]}
              placeholder={i === 0 ? 'ör. Zeynep' : 'ör. Emre'}
              maxLength={24}
              disabled={disabled || match.started}
              onChange={(e) => {
                const next: [string, string] = [...match.rawNames]
                next[i] = e.target.value
                match.setRawNames(next)
              }}
            />
            {sideLabels && <span className="players__side">{sideLabels[i]}</span>}
          </div>
        ))}
      </div>
      {extra}
      <Row label="Biçim">
        <Segmented<MatchFormat>
          label="Karşılaşma biçimi"
          value={match.format}
          onChange={match.setFormat}
          disabled={disabled || match.started}
          options={[
            { value: 'tek', label: 'Tek tur' },
            { value: 'ucte-iki', label: '3’te 2' },
          ]}
        />
      </Row>
      {match.started && <p className="editor__hint">Karşılaşma sürerken oyuncular ve biçim kilitlidir. “Yeni karşılaşma” ile değiştirebilirsin.</p>}
    </div>
  )
}

/** Sahnedeki skor tabelası: isimler, taraflar ve kazanılan turlar. */
export function Scoreboard({ match, sides, highlight }: { match: MatchState; sides?: [ReactNode, ReactNode]; highlight?: Side | null }) {
  const need = winsNeeded(match.format)
  return (
    <div className="score" role="group" aria-label="Skor">
      {(['a', 'b'] as Side[]).map((s, i) => (
        <div key={s} className={`score__side score__side--${s}${highlight === s ? ' is-lead' : ''}${match.winner === s ? ' is-winner' : ''}`}>
          <span className="score__name">{match.names[i]}</span>
          {sides && <span className="score__tag">{sides[i]}</span>}
          {need > 1 && (
            <span className="score__pips" aria-label={`${match.score[s]} galibiyet`}>
              {Array.from({ length: need }, (_, k) => (
                <motion.span key={k} className={`score__pip${k < match.score[s] ? ' is-on' : ''}`} animate={k < match.score[s] ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.35 }} />
              ))}
            </span>
          )}
        </div>
      ))}
      <span className="score__vs" aria-hidden="true">
        {need > 1 ? `${match.score.a} – ${match.score.b}` : 'vs'}
      </span>
    </div>
  )
}
