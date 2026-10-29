import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { uid } from '../lib/random'
import { diceOutcome, rollDice, total, type DieValue } from '../lib/rules/dice'
import type { RoundOutcome } from '../lib/rules/match'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, useMedia } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Die, type DieHandle } from '../objects/Die'
import { Button, Group, Row, Segmented } from '../ui/controls'
import { nameOf, PlayersForm, Scoreboard, useMatch } from '../ui/Match'
import { ToolScaffold } from '../ui/ToolScaffold'

type Mode = 'tek' | 'mac'
type Count = '1' | '2'
const isMode = (v: unknown): v is Mode => v === 'tek' || v === 'mac'
const isCount = (v: unknown): v is Count => v === '1' || v === '2'

const sumText = (v: readonly DieValue[]) => (v.length === 1 ? String(v[0]) : `${v.join(' + ')} = ${total(v)}`)

export function DiceTool() {
  const [mode, setMode] = usePersistent<Mode>('zar:mode', 'tek', isMode)
  const [countS, setCountS] = usePersistent<Count>('zar:count', '2', isCount)
  const count = Number(countS)
  const match = useMatch('zar')
  const [vals, setVals] = useState<{ a: DieValue[]; b?: DieValue[] } | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [live, setLive] = useState('')
  const refsA = useRef<(DieHandle | null)[]>([])
  const refsB = useRef<(DieHandle | null)[]>([])
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const wide = useMedia('(min-width: 560px)')
  const { record } = useStore()
  const matchKey = useRef(uid())

  const isMatch = mode === 'mac'
  const over = isMatch && match.winner !== null
  const size = isMatch ? (wide ? 84 : 64) : wide ? 112 : 96

  const roll = () =>
    run(async () => {
      if (over) return
      // Önce tüm değerler belirlenir; zarlar bu yüzlerle durur.
      const a = rollDice(count)
      const b = isMatch ? rollDice(count) : undefined
      setVals(null)
      setOutcome(null)
      setLive('')
      haptic(12)
      sfx.dice()
      const anims = a.map((v, i) => refsA.current[i]?.roll(v, { reduced, delay: i * 0.08, from: -1 }))
      if (b) anims.push(...b.map((v, i) => refsB.current[i]?.roll(v, { reduced, delay: (reduced ? 0.05 : 0.45) + i * 0.08, from: 1 })))
      if (b && !reduced) setTimeout(() => sfx.dice(), 450)
      await Promise.all(anims)
      if (!mounted.current) return
      setVals({ a, b })
      if (!b) {
        setLive(`Zar: ${sumText(a)}.`)
        record(uid(), { tool: 'zar', title: count === 1 ? `${a[0]}` : `Toplam ${total(a)}`, detail: count === 1 ? 'Tek zar' : `${a.join(' ve ')}` })
        sfx.reveal()
        return
      }
      const o = diceOutcome(a, b)
      setOutcome(o)
      const ta = total(a)
      const tb = total(b)
      if (o === 'berabere') {
        setLive(`${match.names[0]} ${ta}, ${match.names[1]} ${tb}. Berabere; tur yeniden atılmalı.`)
        sfx.tick()
        return
      }
      const { score, winner } = match.push(o)
      const roundWinner = nameOf(match, o)
      sfx.reveal()
      if (winner) {
        const w = nameOf(match, winner)
        const st = match.format === 'tek' ? `${ta}–${tb}` : `${score.a}–${score.b}`
        setLive(`${match.names[0]} ${ta}, ${match.names[1]} ${tb}. Karşılaşmayı ${w} kazandı (${st}).`)
        record(matchKey.current, {
          tool: 'zar',
          title: `${w} kazandı`,
          detail: `${match.names[0]} – ${match.names[1]} · ${count} zar · ${match.format === 'tek' ? `toplam ${ta}–${tb}` : `3’te 2, ${score.a}–${score.b}`}`,
        })
        sfx.win()
      } else {
        setLive(`${match.names[0]} ${ta}, ${match.names[1]} ${tb}. Turu ${roundWinner} aldı. Skor ${score.a}–${score.b}.`)
      }
    })

  const newMatch = () => {
    match.reset()
    matchKey.current = uid()
    setVals(null)
    setOutcome(null)
    setLive('Yeni karşılaşma hazır.')
  }

  const tray = (side: 'a' | 'b', refs: typeof refsA, values?: DieValue[]) => (
    <div className={`tray${outcome === side ? ' is-win' : ''}`}>
      <div className="tray__dice">
        {Array.from({ length: count }, (_, i) => (
          <Die
            key={`${side}-${count}-${i}`}
            ref={(h) => {
              refs.current[i] = h
            }}
            size={size}
          />
        ))}
      </div>
      <p className="tray__sum" aria-hidden="true">
        {values && !busy ? sumText(values) : ' '}
      </p>
    </div>
  )

  const roundLine =
    isMatch && vals?.b && !busy
      ? outcome === 'berabere'
        ? 'Berabere. Bu tur sayılmaz, yeniden at.'
        : match.winner
          ? `Karşılaşmayı ${nameOf(match, match.winner)} kazandı`
          : outcome
            ? `Bu turu ${nameOf(match, outcome)} aldı`
            : ''
      : ''

  const stage = (
    <div className="dice-stage">
      {isMatch && <Scoreboard match={match} highlight={outcome && outcome !== 'berabere' ? outcome : null} />}
      {isMatch ? (
        <div className="trays">
          <div className="trays__col">
            <span className="trays__name">{match.names[0]}</span>
            {tray('a', refsA, vals?.a)}
          </div>
          <div className="trays__col">
            <span className="trays__name">{match.names[1]}</span>
            {tray('b', refsB, vals?.b)}
          </div>
        </div>
      ) : (
        <button type="button" className="object-hit" onClick={roll} disabled={busy} aria-label="Zarları at">
          {tray('a', refsA)}
        </button>
      )}
      <div className="stage-result" aria-hidden="true">
        <AnimatePresence mode="wait">
          {vals && !busy && !isMatch && (
            <motion.div key={vals.a.join()} className="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}>
              <span className="result__value">{total(vals.a)}</span>
              <span className="result__sub">{count === 2 ? `${vals.a[0]} + ${vals.a[1]}` : 'Tek zar'}</span>
            </motion.div>
          )}
          {roundLine && (
            <motion.div key={roundLine + match.rounds.length} className={`result result--line${outcome === 'berabere' ? ' is-tie' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="result__line">{roundLine}</span>
            </motion.div>
          )}
          {!vals && !busy && (
            <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {isMatch ? `Her oyuncu ${count} zar atar; yüksek toplam kazanır.` : 'Zarları atmak için dokun'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  const controls = (
    <>
      <Group title="Zarlar" id="zar-ayar">
        <Row label="Zar sayısı">
          <Segmented<Count>
            label="Zar sayısı"
            value={countS}
            onChange={(c) => {
              setCountS(c)
              newMatch()
            }}
            disabled={busy || match.started}
            options={[
              { value: '1', label: '1 zar' },
              { value: '2', label: '2 zar' },
            ]}
          />
        </Row>
        <Row label="Mod">
          <Segmented<Mode>
            label="Mod"
            value={mode}
            onChange={(m) => {
              setMode(m)
              newMatch()
            }}
            disabled={busy}
            options={[
              { value: 'tek', label: 'Serbest atış' },
              { value: 'mac', label: 'Karşılaşma' },
            ]}
          />
        </Row>
      </Group>
      {isMatch && (
        <Group title="Oyuncular" id="zar-oyuncu">
          <PlayersForm match={match} disabled={busy} />
        </Group>
      )}
    </>
  )

  const action = over ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={newMatch}>
      Yeni karşılaşma
    </Button>
  ) : (
    <Button variant="primary" size="lg" block onClick={roll} disabled={busy}>
      {busy ? 'Yuvarlanıyor…' : outcome === 'berabere' ? 'Beraberlik: yeniden at' : vals ? 'Yeniden at' : count === 1 ? 'Zarı at' : 'Zarları at'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="zar"
      stage={stage}
      controls={controls}
      action={action}
      live={live}
      rules={
        isMatch
          ? [
              `Her oyuncu ${count} altı yüzlü zar atar; yüksek toplam turu alır.`,
              'Toplamlar eşitse tur berabere biter ve yeniden atılır.',
              match.format === 'tek' ? 'Tek tur oynanır.' : 'İki turu ilk kazanan karşılaşmayı alır.',
            ]
          : ['Her yüz (1–6) eşit olasılıklıdır.', 'Sonuç zarlar atılmadan önce belirlenir; zarlar bu yüzlerle durur.']
      }
    />
  )
}
