import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { makeEntries, type Entry } from '../lib/entries'
import { uid } from '../lib/random'
import { MAX_OPTIONS, MIN_OPTIONS, planSpin } from '../lib/rules/wheel'
import { isEntryList } from '../lib/storage'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { labelBudget, Wheel, type WheelHandle } from '../objects/Wheel'
import { Button, Row, Switch } from '../ui/controls'
import { useEntryEditor } from '../ui/EntryEditor'
import { useExample } from '../ui/ExampleBanner'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

export function WheelTool() {
  const [options, setOptions] = usePersistent<Entry[]>('cark:list', [], isEntryList)
  // Anahtar yenilendi: eski cihazlarda saklı "kapalı" değeri yeni varsayılanı (açık) ezmesin.
  const [removeWinner, setRemoveWinner] = usePersistent('cark:remove2', true, isBool)
  const [winner, setWinner] = useState<Entry | null>(null)
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null)
  const [live, setLive] = useState('')
  const wheel = useRef<WheelHandle>(null)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const banner = useExample('cark', (e) => {
    const prev = options
    setOptions(makeEntries(e.names ?? []))
    return () => setOptions(prev)
  })

  const enough = options.length >= MIN_OPTIONS
  const labels = useMemo(() => options.map((o) => o.name), [options])
  const usesLegend = enough && labelBudget(options.length) === 0
  const sig = useMemo(() => options.map((o) => o.id + o.name).join('|'), [options])

  useEffect(() => {
    // Liste elle değişince eski sonuç geçersizdir.
    if (!busy) {
      setWinnerIdx(null)
      setWinner(null)
    }
  }, [sig])

  const editor = useEntryEditor({ entries: options, onChange: setOptions, noun: 'seçenek', placeholder: 'Pizza, Döner, Mantı', disabled: busy, max: MAX_OPTIONS })

  const spin = () =>
    run(async () => {
      if (!wheel.current) return
      // "Kazananı çıkar" açıksa önceki kazanan bu turdan önce listeden düşer.
      const pending = removeWinner && winner && options.some((o) => o.id === winner.id)
      const snapshot = pending ? options.filter((o) => o.id !== winner.id) : options.slice()
      if (snapshot.length < MIN_OPTIONS) return
      if (pending) {
        setOptions(snapshot)
        setWinner(null)
        setWinnerIdx(null)
        await wait(reduced ? 60 : 380)
        if (!mounted.current || !wheel.current) return
      }
      // Önce kazanan ve hedef açı hesaplanır.
      const plan = planSpin(wheel.current.rotation(), snapshot.length)
      const chosen = snapshot[plan.index]
      const key = uid()
      setWinner(null)
      setWinnerIdx(null)
      setLive('')
      haptic(12)
      sfx.whoosh()
      await wheel.current.spinTo(plan.target, reduced)
      if (!mounted.current) return
      setWinner(chosen)
      setWinnerIdx(plan.index)
      sfx.win()
      haptic(30)
      setLive(`Çark durdu. Sonuç: ${chosen.name}.`)
      record(key, { tool: 'cark', title: chosen.name, detail: `${snapshot.length} seçenek: ${snapshot.map((o) => o.name).join(', ')}` })
    })

  const willRemove = removeWinner && winner !== null && options.some((o) => o.id === winner.id)
  const nextCount = options.length - (willRemove ? 1 : 0)

  const display = enough ? labels : ['', '']

  const stage = (
    <>
      <div className="stage-body wheel-stage">
        <div className={`wheel-wrap${enough ? '' : ' is-empty'}`}>
          <Wheel
            ref={wheel}
            labels={display}
            winner={winnerIdx}
            disabled={busy}
            onRemove={(i) => editor.remove(options[i].id)}
          />
          {!enough && <p className="wheel-empty">En az iki seçenek ekle</p>}
        </div>
        {usesLegend && (
          <AnimatePresence mode="wait">
          {winner && !busy && (
            <motion.div
              key={winner.id + String(winnerIdx)}
              className="result"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
            >
              <span className="result__value">{winner.name}</span>
            </motion.div>
          )}
          </AnimatePresence>
        )}
        {usesLegend && (
          <ol className="legend" aria-label="Dilim numaraları">
            {options.map((o, i) => (
              <li key={o.id} className={winnerIdx === i && !busy ? 'is-win' : undefined}>
                <span className="legend__n">{i + 1}</span>
                <span>{o.name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <StageBar
        right={
          <RoundButton
            icon="strike"
            label={removeWinner ? 'Kazananı sonraki turdan çıkar: açık' : 'Kazananı sonraki turdan çıkar: kapalı'}
            on={removeWinner}
            disabled={busy}
            onClick={() => setRemoveWinner(!removeWinner)}
          />
        }
      />
    </>
  )

  const removeOnly = () => {
    if (!winner) return
    setOptions(options.filter((o) => o.id !== winner.id))
    setWinner(null)
    setWinnerIdx(null)
    setLive(`“${winner.name}” çarktan çıkarıldı.`)
  }

  const spinLabel = busy ? 'Dönüyor…' : winner ? 'Yeniden çevir' : 'Çarkı çevir'
  const action = (
    <>
      {willRemove && !busy && nextCount < MIN_OPTIONS && (
        <p className="actionbar__note">“{winner.name}” çıkarılınca tek seçenek kalıyor; yeni seçenek ekle.</p>
      )}
      {willRemove ? (
        <div className="actionbar__split">
          <Button variant="secondary" size="lg" block onClick={removeOnly} disabled={busy}>
            Çıkar
          </Button>
          <Button variant="primary" size="lg" block onClick={spin} disabled={busy || nextCount < MIN_OPTIONS}>
            {spinLabel}
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="lg" block onClick={spin} disabled={busy || options.length < MIN_OPTIONS}>
          {spinLabel}
        </Button>
      )}
    </>
  )

  return (
    <ToolScaffold
      tool="cark"
      stage={stage}
      action={action}
      settings={
        <Row label="Kazananı çıkar" hint="Sağ alttaki çizgili düğmenin işi: açıkken sonuçtan sonra “Çıkar” ve “Yeniden çevir” düğmeleri görünür.">
          <Switch checked={removeWinner} onChange={setRemoveWinner} label="Kazananı çıkar" disabled={busy} />
        </Row>
      }
      onReset={() => {
        setOptions([])
        setWinner(null)
        setWinnerIdx(null)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || (options.length === 0 && !winner)}
      adder={editor.adder}
      extra={editor.listActions}
      overlays={editor.sheets}
      live={live}
      banner={banner}
      rules={[
        'Her seçeneğin çıkma olasılığı eşittir.',
        'Sonuç çark dönmeden önce belirlenir; çark işaretçinin gösterdiği dilimde durur.',
        'Bir seçeneği silmek için çarktaki adına dokun, çıkan küçük çöp düğmesine bas.',
        'Sağ alttaki çizgili düğme açıkken sonuçtan sonra iki düğme çıkar: “Çıkar” kazananı çarktan alır, “Yeniden çevir” kazananı çıkarıp hemen çevirir.',
        'En az iki seçenek gerekir.',
      ]}
    />
  )
}
