import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { uid } from '../lib/random'
import { cardName, cardOutcome, Deck, type Card } from '../lib/rules/cards'
import type { RoundOutcome, Side } from '../lib/rules/match'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { CardFan } from '../objects/CardFan'
import { CARD_BACKS, CARD_FACES, CARD_INKS, CardBack, CardFace, cardVars, isBackId, isFaceId, isInkId } from '../objects/PlayingCard'
import { useTheme } from '../state/useTheme'
import { ColorField } from '../ui/ColorField'
import { Button, Notice, Row, Switch } from '../ui/controls'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const FAN = 7
const PLAYERS = ['1. oyuncu', '2. oyuncu'] as const

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
  const [duel, setDuel] = usePersistent('kart:duel2', false, isBool)
  const [back, setBack] = usePersistent('kart:back', 'sistem', isBackId)
  const [faceC, setFaceC] = usePersistent('kart:yuz', 'sistem', isFaceId)
  const [inkC, setInkC] = usePersistent('kart:sembol', 'sistem', isInkId)
  const theme = useTheme()
  // Açık temada "sistem" sırtı, her açılışta kırmızı ya da mavi olur.
  const blue = useMemo(() => Math.random() < 0.5, [])
  const vars = cardVars(theme, back, blue, faceC, inkC)
  const deck = useRef<Deck>(null as unknown as Deck)
  if (!deck.current) deck.current = new Deck()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const [single, setSingle] = useState<Card | null>(null)
  const [pair, setPair] = useState<{ a: Card | null; b: Card | null }>({ a: null, b: null })
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const turn: Side | null = !duel ? null : pair.a && pair.b ? null : pair.a ? 'b' : 'a'
  const roundDone = duel && !!pair.a && !!pair.b
  const remaining = deck.current.remaining
  const need = duel ? (roundDone ? 2 : turn === 'b' ? 1 : 2) : 1
  const short = remaining < need
  const fan = deck.current.peekTop(Math.min(FAN, remaining))
  const name = (s: Side) => PLAYERS[s === 'a' ? 0 : 1]

  const play = (index: number) =>
    run(async () => {
      if (short || roundDone) return
      const card = deck.current.drawAt(index)
      refresh()
      sfx.card()
      haptic(10)
      setLive('')
      if (!duel) {
        setSingle(card)
        await wait(reduced ? 150 : 1050)
        if (!mounted.current) return
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
        setLive(`${PLAYERS[0]}: ${cardName(card)}. Sıra şimdi ${PLAYERS[1]} adlı oyuncuda.`)
        return
      }
      const a = next.a as Card
      const o = cardOutcome(a, card)
      setOutcome(o)
      if (o === 'berabere') {
        sfx.tick()
        setLive(`${PLAYERS[0]} ${cardName(a)}, ${PLAYERS[1]} ${cardName(card)}. Aynı değer: berabere, yeniden oynanır.`)
        return
      }
      const w = name(o)
      sfx.win()
      setLive(`${PLAYERS[0]} ${cardName(a)}, ${PLAYERS[1]} ${cardName(card)}. ${w} kazandı.`)
      record(uid(), { tool: 'kart', title: `${w} kazandı`, detail: `${PLAYERS[0]}: ${cardName(a)} – ${PLAYERS[1]}: ${cardName(card)}` })
    })

  const nextRound = () => {
    setPair({ a: null, b: null })
    setOutcome(null)
    setLive('Yeni tur: kartlar masadan kaldırıldı.')
  }

  const clearTable = () => {
    setSingle(null)
    setPair({ a: null, b: null })
    setOutcome(null)
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
    clearTable()
    sfx.whoosh()
    setLive('Deste sıfırlandı: 52 kart karıştırıldı.')
  }

  const roundLine = !duel
    ? single && !busy
      ? cardName(single)
      : ''
    : outcome === 'berabere'
      ? 'Aynı değer: berabere. Tur yeniden oynanır.'
      : outcome
        ? `${name(outcome)} kazandı`
        : turn
          ? `Sıra ${name(turn)} — bir kart seç`
          : ''

  const stage = (
    <>
      <div className="stage-body card-stage" style={vars}>
        <LayoutGroup>
          <div className={`table${duel ? ' table--duel' : ''}`}>
            {duel ? (
              <>
                <Slot label={PLAYERS[0]} card={pair.a} reduced={reduced} highlight={outcome === 'a'} active={turn === 'a'} />
                <Slot label={PLAYERS[1]} card={pair.b} reduced={reduced} highlight={outcome === 'b'} active={turn === 'b'} />
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
          {!short && !roundDone ? <CardFan cards={fan} onPlay={play} disabled={busy} reduced={reduced} /> : <div className="fan fan--placeholder" aria-hidden="true" />}
        </LayoutGroup>
        <p className="deck-count">
          Destede <strong>{remaining}</strong> kart
        </p>
      </div>
      {short && <Notice tone="warn">Destede yeterli kart kalmadı. Devam etmek için desteyi sıfırla.</Notice>}
      <StageBar
        left={
          <>
            <RoundButton
              icon="card"
              label="Tek kart"
              on={!duel}
              disabled={busy}
              onClick={() => {
                setDuel(false)
                clearTable()
              }}
            />
            <RoundButton
              icon="duel"
              label="Yüksek kart karşılaşması"
              on={duel}
              disabled={busy}
              onClick={() => {
                setDuel(true)
                clearTable()
              }}
            />
          </>
        }
        right={
          <>
            <RoundButton icon="shuffle" label="Kalan kartları karıştır" disabled={busy || remaining < 2} onClick={shuffle} />
          </>
        }
      />
    </>
  )

  const action = short ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={resetDeck} disabled={busy}>
      Desteyi sıfırla
    </Button>
  ) : roundDone ? (
    <Button variant="primary" size="lg" block onClick={nextRound} disabled={busy}>
      {outcome === 'berabere' ? 'Turu yeniden oyna' : 'Sonraki tur'}
    </Button>
  ) : (
    <Button variant="primary" size="lg" block onClick={() => play(0)} disabled={busy}>
      {busy ? 'Açılıyor…' : turn ? `${name(turn)} için kart çek` : 'Kart çek'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="kart"
      stage={stage}
      action={action}
      settings={
        <>
          <ColorField
            label="Kart sırtı"
            value={back}
            onChange={setBack}
            options={[
              { value: 'sistem', label: 'Sistem', style: { background: String(vars['--cb-base' as keyof typeof vars]), boxShadow: `inset 0 0 0 3px ${String(vars['--cb-frame' as keyof typeof vars])}` } },
              ...CARD_BACKS.map((b) => ({ value: b.id, label: b.name, style: { background: b.base, boxShadow: `inset 0 0 0 3px ${b.frame}` } })),
            ]}
          />
          <ColorField
            label="Kart ön yüzü"
            value={faceC}
            onChange={setFaceC}
            options={[
              { value: 'sistem', label: 'Sistem', style: { background: String(cardVars(theme, back, blue)['--cf-bg' as keyof typeof vars]) } },
              ...CARD_FACES.map((f) => ({ value: f.id, label: f.name, style: { background: f.bg } })),
            ]}
          />
          <ColorField
            label="Semboller"
            value={inkC}
            onChange={setInkC}
            options={[
              { value: 'sistem', label: 'Sistem', style: { background: `linear-gradient(90deg, ${String(cardVars(theme, back, blue)['--cf-ink' as keyof typeof vars])} 50%, ${String(cardVars(theme, back, blue)['--cf-red' as keyof typeof vars])} 50%)` } },
              ...CARD_INKS.map((c) => ({ value: c.id, label: c.name, style: { background: `linear-gradient(90deg, ${c.ink} 50%, ${c.red} 50%)` } })),
            ]}
          />
          <Row label="Karıştır" hint="Kalan kartları karıştırır (sağ alttaki düğmenin işi).">
            <Button variant="secondary" icon="shuffle" disabled={busy || remaining < 2} onClick={shuffle}>
              Karıştır
            </Button>
          </Row>
          <Row label="Karşılaşma" hint="Sol alttaki iki düğmenin işi: kapalıyken tek kart, açıkken iki oyuncu birer kart çeker ve yüksek kart kazanır.">
            <Switch
              checked={duel}
              label="Karşılaşma"
              disabled={busy}
              onChange={(v) => {
                setDuel(v)
                clearTable()
              }}
            />
          </Row>
        </>
      }
      onReset={resetDeck}
      resetDisabled={busy}
      live={live}
      rules={
        duel
          ? [
              'Standart 52 kartlık deste, joker yok.',
              'Değer sırası 2’den As’a yükselir; As en yüksektir.',
              'Türler arasında üstünlük yoktur; aynı değer berabere sayılır ve tur yeniden oynanır.',
              'Sol alttaki iki düğme tek kart ile yüksek kart karşılaşması arasında geçer; sağ alttaki düğme kalan kartları karıştırır; desteyi sıfırlamak için sol üstteki düğmeyi kullan. Kart rengini Ayarlar bölümünden değiştirebilirsin.',
            ]
          : [
              'Standart 52 kartlık deste, joker yok.',
              'Çekilen kart deste sıfırlanana kadar yeniden çıkmaz.',
              'Sol alttaki iki düğme tek kart ile yüksek kart karşılaşması arasında geçer; sağ alttaki düğme kalan kartları karıştırır; desteyi sıfırlamak için sol üstteki düğmeyi kullan. Kart rengini Ayarlar bölümünden değiştirebilirsin.',
            ]
      }
    />
  )
}
