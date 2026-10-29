import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { uid } from '../lib/random'
import { FACE_LABEL, flip, type Face } from '../lib/rules/coin'
import { haptic, sfx } from '../features/sound'
import { useTheme } from '../state/useTheme'
import { useBusy, useMounted, useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Coin, type CoinHandle } from '../objects/Coin'
import { CoinSymbol, isSymbolId, isToneId, SYMBOLS, symbolName, toneById, tonesFor, toneGradient, type SymbolId } from '../objects/coinStyles'
import { Button } from '../ui/controls'
import { ColorField } from '../ui/ColorField'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

/** Listede bir sonraki öğeye geçer (sona gelince başa döner). */
const next = <T,>(list: readonly T[], i: number): T => list[(i + 1) % list.length]

export function CoinTool() {
  const [yaziId, setYaziId] = usePersistent('para:yazi2', 'sistem', isToneId)
  const [turaId, setTuraId] = usePersistent('para:tura2', 'sistem', isToneId)
  const [symbol, setSymbol] = usePersistent<SymbolId>('para:sembol', 'sincap', isSymbolId)
  const [face, setFace] = useState<Face | null>(null)
  const [live, setLive] = useState('')
  const coin = useRef<CoinHandle>(null)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const theme = useTheme()
  const yaziList = tonesFor(theme, 'yazi')
  const turaList = tonesFor(theme, 'tura')
  const yazi = toneById(yaziId, theme, 'yazi')
  const tura = toneById(turaId, theme, 'tura')

  const toss = () =>
    run(async () => {
      if (!coin.current) return
      // Önce yüz belirlenir; para yalnızca bu yüzle düşecek şekilde döner.
      const result = flip()
      setFace(null)
      setLive('')
      haptic(10)
      sfx.whoosh()
      await coin.current.flip(result, reduced)
      if (!mounted.current) return
      sfx.coin()
      haptic(25)
      setFace(result)
      const label = FACE_LABEL[result]
      setLive(`Para düştü: ${label}.`)
      record(uid(), { tool: 'para', title: label, detail: 'Tek atış' })
    })

  const swatch = (tone: typeof yazi, content: ReactNode) => (
    <span className="swatch" style={{ background: toneGradient(tone), color: tone.ink }}>
      {content}
    </span>
  )

  const stage = (
    <>
      <div className="stage-body coin-stage">
        <button type="button" className="object-hit" onClick={toss} disabled={busy} aria-label="Parayı at">
          <Coin ref={coin} size={196} yazi={yazi} tura={tura} symbol={symbol} />
        </button>
        <div className="stage-result" aria-hidden="true">
          <AnimatePresence mode="wait">
            {face && !busy ? (
              <motion.div key={face + String(live)} className="result" initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', bounce: 0.35, duration: 0.45 }}>
                <span className="result__value">{FACE_LABEL[face]}</span>
              </motion.div>
            ) : (
              <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: busy ? 0 : 1 }} exit={{ opacity: 0 }}>
                Parayı atmak için dokun
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
      <StageBar
        left={
          <RoundButton
            label={`Yazı yüzünün rengi: ${yazi.name}. Değiştirmek için dokun.`}
            disabled={busy}
            onClick={() => setYaziId(next(yaziList, yaziList.findIndex((t) => t.id === yaziId)).id)}
          >
            {swatch(yazi, <b>1</b>)}
          </RoundButton>
        }
        center={
          <RoundButton
            label={`Tura yüzünün rengi: ${tura.name}. Değiştirmek için dokun.`}
            disabled={busy}
            onClick={() => setTuraId(next(turaList, turaList.findIndex((t) => t.id === turaId)).id)}
          >
            {swatch(tura, <CoinSymbol id={symbol} size={16} color={tura.ink} />)}
          </RoundButton>
        }
        right={
          <RoundButton
            label={`Tura sembolü: ${symbolName(symbol)}. Değiştirmek için dokun.`}
            disabled={busy}
            onClick={() => setSymbol(next(SYMBOLS, SYMBOLS.findIndex((s) => s.id === symbol)).id)}
          >
            <CoinSymbol id={symbol} size={24} color="currentColor" />
          </RoundButton>
        }
      />
    </>
  )

  const action = (
    <Button variant="primary" size="lg" block onClick={toss} disabled={busy}>
      {busy ? 'Havada…' : 'Parayı at'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="para"
      stage={stage}
      action={action}
      settings={
        <>
          <ColorField label="Yazı yüzü rengi (soldaki düğme)" value={yaziId} onChange={setYaziId} disabled={busy} options={yaziList.map((t) => ({ value: t.id, label: t.name, style: { background: toneGradient(t) } }))} />
          <ColorField label="Tura yüzü rengi (ortadaki düğme)" value={turaId} onChange={setTuraId} disabled={busy} options={turaList.map((t) => ({ value: t.id, label: t.name, style: { background: toneGradient(t) } }))} />
          <ColorField
            label="Tura sembolü (sağdaki düğme)"
            value={symbol}
            onChange={setSymbol}
            disabled={busy}
            options={SYMBOLS.map((s) => ({ value: s.id, label: s.name, content: <CoinSymbol id={s.id} size={18} color="currentColor" /> }))}
          />
        </>
      }
      onReset={() => {
        setFace(null)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || face === null}
      live={live}
      rules={[
        'Yazı ve tura eşit olasılıklıdır.',
        'Sonuç para havalanmadan önce belirlenir; para bu yüzle düşer.',
        'Alttaki üç düğme sırayla yazı yüzünün rengini, tura yüzünün rengini ve tura sembolünü değiştirir; her dokunuşta bir sonrakine geçer.',
      ]}
    />
  )
}
