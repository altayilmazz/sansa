import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { uid } from '../lib/random'
import { diceOutcome, rollDice, total, type DieValue } from '../lib/rules/dice'
import type { RoundOutcome } from '../lib/rules/match'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, useMedia } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Die, type DieHandle } from '../objects/Die'
import { Button, Row, Segmented, Switch } from '../ui/controls'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

type Count = '1' | '2'
const isCount = (v: unknown): v is Count => v === '1' || v === '2'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

const PLAYERS = ['1. oyuncu', '2. oyuncu'] as const
const sumText = (v: readonly DieValue[]) => (v.length === 1 ? String(v[0]) : `${v.join(' + ')} = ${total(v)}`)

export function DiceTool() {
  const [countS, setCountS] = usePersistent<Count>('zar:count', '2', isCount)
  const [duel, setDuel] = usePersistent('zar:duel2', false, isBool)
  const count = Number(countS)
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

  const size = duel ? (wide ? 84 : 66) : wide ? 112 : 96

  const clear = () => {
    setVals(null)
    setOutcome(null)
    setLive('')
  }

  const roll = () =>
    run(async () => {
      // Önce tüm değerler belirlenir; zarlar bu yüzlerle durur.
      const a = rollDice(count)
      const b = duel ? rollDice(count) : undefined
      clear()
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
        setLive(`${PLAYERS[0]} ${ta}, ${PLAYERS[1]} ${tb}. Berabere; yeniden atılmalı.`)
        sfx.tick()
        return
      }
      const w = PLAYERS[o === 'a' ? 0 : 1]
      sfx.win()
      setLive(`${PLAYERS[0]} ${ta}, ${PLAYERS[1]} ${tb}. ${w} kazandı.`)
      record(uid(), { tool: 'zar', title: `${w} kazandı`, detail: `${PLAYERS[0]} ${ta} – ${PLAYERS[1]} ${tb} · her oyuncu ${count} zar` })
    })

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
    duel && vals?.b && !busy
      ? outcome === 'berabere'
        ? 'Berabere. Yeniden at.'
        : outcome
          ? `${PLAYERS[outcome === 'a' ? 0 : 1]} kazandı`
          : ''
      : ''

  const stage = (
    <>
      <div className="stage-body dice-stage">
        {duel ? (
          <div className="trays">
            <div className="trays__col">
              <span className="trays__name">{PLAYERS[0]}</span>
              {tray('a', refsA, vals?.a)}
            </div>
            <div className="trays__col">
              <span className="trays__name">{PLAYERS[1]}</span>
              {tray('b', refsB, vals?.b)}
            </div>
          </div>
        ) : (
          <button type="button" className="object-hit" onClick={roll} disabled={busy} aria-label="Zarları at">
            {tray('a', refsA, vals?.a)}
          </button>
        )}
        <div className="stage-result" aria-hidden="true">
          <AnimatePresence mode="wait">
            {vals && !busy && !duel && (
              <motion.div key={vals.a.join()} className="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}>
                <span className="result__value">{total(vals.a)}</span>
                <span className="result__sub">{count === 2 ? `${vals.a[0]} + ${vals.a[1]}` : 'Tek zar'}</span>
              </motion.div>
            )}
            {roundLine && (
              <motion.div key={roundLine + String(live)} className={`result result--line${outcome === 'berabere' ? ' is-tie' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <span className="result__line">{roundLine}</span>
              </motion.div>
            )}
            {!vals && !busy && (
              <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {duel ? 'Yüksek toplam kazanır' : 'Zarları atmak için dokun'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <StageBar
        left={
          <>
            <RoundButton
              label="Tek zar"
              on={count === 1}
              disabled={busy}
              onClick={() => {
                setCountS('1')
                clear()
              }}
            >
              I
            </RoundButton>
            <RoundButton
              label="İki zar"
              on={count === 2}
              disabled={busy}
              onClick={() => {
                setCountS('2')
                clear()
              }}
            >
              II
            </RoundButton>
          </>
        }
        right={
          <RoundButton
            label={duel ? 'Karşılaşma: açık' : 'Karşılaşma: kapalı'}
            pill
            on={duel}
            disabled={busy}
            onClick={() => {
              setDuel(!duel)
              clear()
            }}
          >
            Vs
          </RoundButton>
        }
      />
    </>
  )

  const action = (
    <Button variant="primary" size="lg" block onClick={roll} disabled={busy}>
      {busy ? 'Yuvarlanıyor…' : outcome === 'berabere' ? 'Beraberlik: yeniden at' : vals ? 'Yeniden at' : count === 1 && !duel ? 'Zarı at' : 'Zarları at'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="zar"
      stage={stage}
      action={action}
      settings={
        <>
          <Row label="Zar sayısı" hint="Sol alttaki I ve II düğmelerinin işi.">
            <Segmented
              label="Zar sayısı"
              value={countS}
              disabled={busy}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
              ]}
              onChange={(v) => {
                setCountS(v)
                clear()
              }}
            />
          </Row>
          <Row label="Karşılaşma" hint="Sağ alttaki Vs düğmesinin işi: iki oyuncu atar, yüksek toplam kazanır.">
            <Switch
              checked={duel}
              label="Karşılaşma"
              disabled={busy}
              onChange={(v) => {
                setDuel(v)
                clear()
              }}
            />
          </Row>
        </>
      }
      onReset={() => {
        setVals(null)
        setOutcome(null)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || vals === null}
      live={live}
      rules={
        duel
          ? [
              `Her oyuncu ${count} altı yüzlü zar atar; yüksek toplam kazanır.`,
              'Toplamlar eşitse berabere biter ve yeniden atılır.',
              'Sol alttaki I ve II zar sayısını, Vs karşılaşmayı kapatıp açar.',
            ]
          : ['Her yüz (1–6) eşit olasılıklıdır.', 'Sonuç zarlar atılmadan önce belirlenir; zarlar bu yüzlerle durur.', 'Sol alttaki I tek zar, II iki zar atar. Sağ alttaki Vs iki oyunculu karşılaşmayı açar.']
      }
    />
  )
}
