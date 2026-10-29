import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { uid } from '../lib/random'
import { coinOutcome, FACE_LABEL, flip, otherFace, type Face } from '../lib/rules/coin'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Coin, type CoinHandle } from '../objects/Coin'
import { Button, Group, Row, Segmented } from '../ui/controls'
import { useExample } from '../ui/ExampleBanner'
import { nameOf, PlayersForm, Scoreboard, useMatch } from '../ui/Match'
import { ToolScaffold } from '../ui/ToolScaffold'

type Mode = 'tek' | 'mac'
const isMode = (v: unknown): v is Mode => v === 'tek' || v === 'mac'
const isFace = (v: unknown): v is Face => v === 'yazi' || v === 'tura'

export function CoinTool() {
  const [mode, setMode] = usePersistent<Mode>('para:mode', 'tek', isMode)
  const [aSide, setASide] = usePersistent<Face>('para:aside', 'yazi', isFace)
  const match = useMatch('para')
  const [face, setFace] = useState<Face | null>(null)
  const [roundText, setRoundText] = useState('')
  const [live, setLive] = useState('')
  const coin = useRef<CoinHandle>(null)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record, announce } = useStore()
  const matchKey = useRef(uid())

  const banner = useExample('para', (e) => {
    const prev = { mode, names: match.rawNames }
    setMode('mac')
    if (e.players) match.setRawNames(e.players)
    return () => {
      setMode(prev.mode)
      match.setRawNames(prev.names)
    }
  })

  const isMatch = mode === 'mac'
  const sides: [string, string] = [FACE_LABEL[aSide], FACE_LABEL[otherFace(aSide)]]
  const over = isMatch && match.winner !== null

  const toss = () =>
    run(async () => {
      if (!coin.current || over) return
      const result = flip()
      setFace(null)
      setRoundText('')
      setLive('')
      haptic(10)
      sfx.whoosh()
      await coin.current.flip(result, reduced)
      if (!mounted.current) return
      sfx.coin()
      haptic(25)
      setFace(result)
      const label = FACE_LABEL[result]
      if (!isMatch) {
        setLive(`Para düştü: ${label}.`)
        record(uid(), { tool: 'para', title: label, detail: 'Tek atış' })
        announce({ tool: 'para', headline: label, detail: 'Tek atış' })
        return
      }
      const outcome = coinOutcome(result, aSide)
      const { score, winner } = match.push(outcome)
      const roundWinner = nameOf(match, outcome === 'a' ? 'a' : 'b')
      if (winner) {
        const w = nameOf(match, winner)
        const scoreText = match.format === 'tek' ? '' : ` (${score.a}–${score.b})`
        setRoundText(`Karşılaşmayı ${w} kazandı${scoreText}`)
        setLive(`${label} geldi. Karşılaşmayı ${w} kazandı${scoreText}.`)
        record(matchKey.current, {
          tool: 'para',
          title: `${w} kazandı`,
          detail: `${match.names[0]} (${sides[0]}) – ${match.names[1]} (${sides[1]})${match.format === 'ucte-iki' ? ` · 3’te 2 · ${score.a}–${score.b}` : ` · ${label}`}`,
        })
        announce({ tool: 'para', headline: `${w} kazandı`, detail: `${label}${scoreText}` })
        sfx.win()
      } else {
        setRoundText(`Bu turu ${roundWinner} aldı · ${score.a}–${score.b}`)
        setLive(`${label} geldi. Turu ${roundWinner} aldı. Skor ${score.a}–${score.b}.`)
      }
    })

  const newMatch = () => {
    match.reset()
    matchKey.current = uid()
    setFace(null)
    setRoundText('')
    setLive('Yeni karşılaşma hazır.')
  }

  const stage = (
    <div className="coin-stage">
      {isMatch && <Scoreboard match={match} sides={sides} />}
      <button type="button" className="object-hit" onClick={over ? undefined : toss} disabled={busy || over} aria-label="Parayı at">
        <Coin ref={coin} size={168} />
      </button>
      <div className="stage-result" aria-hidden="true">
        <AnimatePresence mode="wait">
          {face && !busy ? (
            <motion.div key={face + match.rounds.length} className="result" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.35, duration: 0.45 }}>
              <span className="result__value">{FACE_LABEL[face]}</span>
              {roundText && <span className="result__sub">{roundText}</span>}
            </motion.div>
          ) : (
            <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: busy ? 0 : 1 }} exit={{ opacity: 0 }}>
              {isMatch ? `${match.names[0]}: ${sides[0]} · ${match.names[1]}: ${sides[1]}` : 'Parayı atmak için dokun'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  const controls = (
    <>
      <Group title="Mod" id="para-mod">
        <Row label="Atış türü">
          <Segmented<Mode>
            label="Atış türü"
            value={mode}
            onChange={(m) => {
              setMode(m)
              newMatch()
            }}
            disabled={busy}
            options={[
              { value: 'tek', label: 'Tek atış' },
              { value: 'mac', label: 'Karşılaşma' },
            ]}
          />
        </Row>
      </Group>
      {isMatch && (
        <Group title="Oyuncular" id="para-oyuncu">
          <PlayersForm
            match={match}
            disabled={busy}
            sideLabels={[`Taraf: ${sides[0]}`, `Taraf: ${sides[1]}`]}
            extra={
              <Row label="Taraflar" hint={`${match.names[0]} ${sides[0]}, ${match.names[1]} ${sides[1]} tutuyor.`}>
                <Button variant="plain" icon="swap" onClick={() => setASide(otherFace(aSide))} disabled={busy || match.started}>
                  Değiştir
                </Button>
              </Row>
            }
          />
        </Group>
      )}
    </>
  )

  const action = over ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={newMatch}>
      Yeni karşılaşma
    </Button>
  ) : (
    <Button variant="primary" size="lg" block onClick={toss} disabled={busy}>
      {busy ? 'Havada…' : isMatch && match.started ? `${match.rounds.length + 1}. turu at` : 'Parayı at'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="para"
      stage={stage}
      controls={controls}
      action={action}
      live={live}
      banner={banner}
      rules={
        isMatch
          ? [
              'Her oyuncu bir yüzü tutar; taraflar atıştan önce ekranda gösterilir.',
              'Gelen yüzü tutan oyuncu turu alır. Yazı turada beraberlik olmaz.',
              match.format === 'tek' ? 'Tek tur oynanır.' : 'İki turu ilk kazanan karşılaşmayı alır.',
            ]
          : ['Yazı ve tura eşit olasılıklıdır.', 'Sonuç para havalanmadan önce belirlenir; para bu yüzle düşer.']
      }
    />
  )
}
