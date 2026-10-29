import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { uid } from '../lib/random'
import { cardName, cardOutcome, Deck, type Card } from '../lib/rules/cards'
import type { RoundOutcome, Side } from '../lib/rules/match'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { CardFan } from '../objects/CardFan'
import { CardBack, CardFace } from '../objects/PlayingCard'
import { Button, Group, Notice, Row, Segmented } from '../ui/controls'
import { nameOf, PlayersForm, Scoreboard, useMatch } from '../ui/Match'
import { ToolScaffold } from '../ui/ToolScaffold'

type Mode = 'tek' | 'mac'
const isMode = (v: unknown): v is Mode => v === 'tek' || v === 'mac'
const FAN = 7

/** Masadaki açık kart: önce yelpazeden yuvaya uçar, sonra dönerek açılır. */
function TableCard({ card, reduced, highlight }: { card: Card; reduced: boolean; highlight?: boolean }) {
  return (
    <motion.div layoutId={reduced ? undefined : `card-${card.id}`} className={`pcard pcard--table${highlight ? ' is-win' : ''}`} transition={{ type: 'spring', bounce: 0.18, duration: 0.55 }}>
      <motion.div
        className="pcard__flip"
        initial={{ rotateY: reduced ? 0 : 180, opacity: reduced ? 0 : 1 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={reduced ? { duration: 0.15 } : { delay: 0.42, duration: 0.6, ease: [0.3, 0.7, 0.2, 1] }}
      >
        <div className="pcard__side pcard__side--front">
          <CardFace card={card} />
        </div>
        <div className="pcard__side pcard__side--back">
          <CardBack />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Slot({ label, card, reduced, highlight, active }: { label?: string; card: Card | null; reduced: boolean; highlight?: boolean; active?: boolean }) {
  return (
    <div className={`slot${active ? ' is-active' : ''}`}>
      {label && <span className="slot__label">{label}</span>}
      <div className="slot__well">{card ? <TableCard key={card.id} card={card} reduced={reduced} highlight={highlight} /> : <span className="slot__empty" aria-hidden="true" />}</div>
    </div>
  )
}

export function CardTool() {
  const [mode, setMode] = usePersistent<Mode>('kart:mode', 'tek', isMode)
  const match = useMatch('kart')
  const deck = useRef<Deck>(null as unknown as Deck)
  if (!deck.current) deck.current = new Deck()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [single, setSingle] = useState<Card | null>(null)
  const [recent, setRecent] = useState<Card[]>([])
  const [pair, setPair] = useState<{ a: Card | null; b: Card | null }>({ a: null, b: null })
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()
  const matchKey = useRef(uid())

  const isMatch = mode === 'mac'
  const over = isMatch && match.winner !== null
  const turn: Side | null = !isMatch || over ? null : pair.a && pair.b ? null : pair.a ? 'b' : 'a'
  const roundDone = isMatch && !!pair.a && !!pair.b
  const remaining = deck.current.remaining
  const need = isMatch ? (roundDone ? 2 : turn === 'b' ? 1 : 2) : 1
  const short = remaining < need
  const fan = deck.current.peekTop(Math.min(FAN, remaining))

  const play = (index: number) =>
    run(async () => {
      if (over || short) return
      if (isMatch && roundDone) return
      const card = deck.current.drawAt(index)
      refresh()
      sfx.card()
      haptic(10)
      setLive('')
      if (!isMatch) {
        setSingle(card)
        await wait(reduced ? 150 : 1050)
        if (!mounted.current) return
        setRecent((r) => [card, ...r].slice(0, 6))
        sfx.reveal()
        setLive(`Çekilen kart: ${cardName(card)}. Destede ${deck.current.remaining} kart kaldı.`)
        record(uid(), { tool: 'kart', title: cardName(card), detail: `Tek kart · destede ${deck.current.remaining} kart kaldı` })
        return
      }
      const side: Side = pair.a ? 'b' : 'a'
      const next = { ...pair, [side]: card }
      setPair(next)
      await wait(reduced ? 150 : 1050)
      if (!mounted.current) return
      if (side === 'a') {
        setLive(`${match.names[0]}: ${cardName(card)}. Sıra şimdi ${match.names[1]} adlı oyuncuda.`)
        return
      }
      const a = next.a as Card
      const o = cardOutcome(a, card)
      setOutcome(o)
      if (o === 'berabere') {
        sfx.tick()
        setLive(`${match.names[0]} ${cardName(a)}, ${match.names[1]} ${cardName(card)}. Aynı değer: berabere, tur yeniden oynanır.`)
        return
      }
      const { score, winner } = match.push(o)
      sfx.reveal()
      if (winner) {
        const w = nameOf(match, winner)
        sfx.win()
        setLive(`${match.names[0]} ${cardName(a)}, ${match.names[1]} ${cardName(card)}. Karşılaşmayı ${w} kazandı.`)
        record(matchKey.current, {
          tool: 'kart',
          title: `${w} kazandı`,
          detail: `${match.names[0]}: ${cardName(a)} – ${match.names[1]}: ${cardName(card)}${match.format === 'ucte-iki' ? ` · 3’te 2, ${score.a}–${score.b}` : ''}`,
        })
      } else {
        setLive(`${match.names[0]} ${cardName(a)}, ${match.names[1]} ${cardName(card)}. Turu ${nameOf(match, o)} aldı. Skor ${score.a}–${score.b}.`)
      }
    })

  const nextRound = () => {
    setPair({ a: null, b: null })
    setOutcome(null)
    setLive('Yeni tur: kartlar masadan kaldırıldı.')
  }

  const newMatch = () => {
    match.reset()
    matchKey.current = uid()
    nextRound()
    setLive('Yeni karşılaşma hazır.')
  }

  const shuffle = () => {
    deck.current.shuffle()
    refresh()
    sfx.whoosh()
    setLive(`Kalan ${deck.current.remaining} kart karıştırıldı.`)
  }
  const resetDeck = () => {
    deck.current.reset()
    refresh()
    setSingle(null)
    setRecent([])
    if (isMatch) newMatch()
    sfx.whoosh()
    setLive('Deste sıfırlandı: 52 kart karıştırıldı.')
  }

  const roundLine = !isMatch
    ? single && !busy
      ? cardName(single)
      : ''
    : over
      ? `Karşılaşmayı ${nameOf(match, match.winner as Side)} kazandı`
      : outcome === 'berabere'
        ? 'Aynı değer: berabere. Tur yeniden oynanır.'
        : outcome
          ? `Bu turu ${nameOf(match, outcome)} aldı`
          : turn
            ? `Sıra ${nameOf(match, turn)} — bir kart seç`
            : ''

  const stage = (
    <div className="card-stage">
      {isMatch && <Scoreboard match={match} highlight={outcome && outcome !== 'berabere' ? outcome : null} />}
      <LayoutGroup>
        <div className={`table${isMatch ? ' table--duel' : ''}`}>
          {isMatch ? (
            <>
              <Slot label={match.names[0]} card={pair.a} reduced={reduced} highlight={outcome === 'a'} active={turn === 'a'} />
              <Slot label={match.names[1]} card={pair.b} reduced={reduced} highlight={outcome === 'b'} active={turn === 'b'} />
            </>
          ) : (
            <Slot card={single} reduced={reduced} />
          )}
        </div>
        <div className="stage-result stage-result--tight" aria-hidden="true">
          <AnimatePresence mode="wait">
            {roundLine ? (
              <motion.p key={roundLine} className={`result__line${outcome === 'berabere' ? ' is-tie' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {roundLine}
              </motion.p>
            ) : (
              <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Bir kartı seç ya da yukarı fırlat
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        {!short && !over && !roundDone ? (
          <CardFan cards={fan} onPlay={play} disabled={busy} reduced={reduced} />
        ) : (
          <div className="fan fan--placeholder" aria-hidden="true" />
        )}
      </LayoutGroup>
      <p className="deck-count">
        Destede <strong>{remaining}</strong> kart
      </p>
      {!isMatch && recent.length > 1 && (
        <p className="recent-cards">
          Önceki: {recent.slice(1).map((c) => cardName(c)).join(', ')}
        </p>
      )}
    </div>
  )

  const controls = (
    <>
      <Group title="Mod" id="kart-mod">
        <Row label="Oyun">
          <Segmented<Mode>
            label="Oyun"
            value={mode}
            onChange={(m) => {
              setMode(m)
              newMatch()
              setSingle(null)
            }}
            disabled={busy}
            options={[
              { value: 'tek', label: 'Tek kart' },
              { value: 'mac', label: 'Yüksek kart' },
            ]}
          />
        </Row>
      </Group>
      {isMatch && (
        <Group title="Oyuncular" id="kart-oyuncu">
          <PlayersForm match={match} disabled={busy} />
        </Group>
      )}
      <Group title="Deste" id="kart-deste">
        <Row label="Kalan kartları karıştır">
          <Button variant="plain" icon="shuffle" onClick={shuffle} disabled={busy || remaining < 2}>
            Karıştır
          </Button>
        </Row>
        <Row label="Desteyi sıfırla" hint="Çekilen kartlar desteye döner ve 52 kart yeniden karıştırılır.">
          <Button variant="plain" icon="refresh" onClick={resetDeck} disabled={busy || remaining === 52}>
            Sıfırla
          </Button>
        </Row>
      </Group>
      {short && <Notice tone="warn">Destede yeterli kart kalmadı. Devam etmek için desteyi sıfırla.</Notice>}
    </>
  )

  const action = short ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={resetDeck} disabled={busy}>
      Desteyi sıfırla
    </Button>
  ) : over ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={newMatch}>
      Yeni karşılaşma
    </Button>
  ) : roundDone ? (
    <Button variant="primary" size="lg" block onClick={nextRound} disabled={busy}>
      {outcome === 'berabere' ? 'Turu yeniden oyna' : 'Sonraki tur'}
    </Button>
  ) : (
    <Button variant="primary" size="lg" block onClick={() => play(0)} disabled={busy}>
      {busy ? 'Açılıyor…' : turn ? `${nameOf(match, turn)} için kart çek` : 'Kart çek'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="kart"
      stage={stage}
      controls={controls}
      action={action}
      live={live}
      rules={
        isMatch
          ? [
              'Standart 52 kartlık deste, joker yok.',
              'Değer sırası 2’den As’a yükselir; As en yüksektir.',
              'Türler arasında üstünlük yoktur; aynı değer berabere sayılır ve tur yeniden oynanır.',
              match.format === 'tek' ? 'Tek tur oynanır.' : 'İki turu ilk kazanan karşılaşmayı alır.',
            ]
          : ['Standart 52 kartlık deste, joker yok.', 'Çekilen kart deste sıfırlanana kadar yeniden çıkmaz.']
      }
    />
  )
}
