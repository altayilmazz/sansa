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
import { Button, Group, Notice, Row, Switch } from '../ui/controls'
import { useEntryEditor } from '../ui/EntryEditor'
import { useExample } from '../ui/ExampleBanner'
import { ToolScaffold } from '../ui/ToolScaffold'

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

export function WheelTool() {
  const [options, setOptions] = usePersistent<Entry[]>('cark:list', [], isEntryList)
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
  const truncated = enough && !usesLegend && options.some((o) => [...o.name].length > labelBudget(options.length))
  const sig = useMemo(() => options.map((o) => o.id + o.name).join('|'), [options])

  useEffect(() => {
    // Liste elle değişince eski sonuç geçersizdir.
    if (!busy) {
      setWinnerIdx(null)
      setWinner(null)
    }
  }, [sig])

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
    <div className="wheel-stage">
      <div className={`wheel-wrap${enough ? '' : ' is-empty'}`}>
        <Wheel ref={wheel} labels={display} winner={winnerIdx} />
        {!enough && <p className="wheel-empty">En az iki seçenek ekle</p>}
      </div>
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
  )

  const editor = useEntryEditor({ entries: options, onChange: setOptions, noun: 'seçenek', placeholder: 'Pizza, Döner, Mantı', disabled: busy, max: MAX_OPTIONS })

  const controls = (
    <>
      <Group title="Seçenekler" id="cark-secenek">
        {editor.body}
      </Group>
      {truncated && <Notice>Uzun seçenekler çarkta kısaltılarak gösterilir; sonuçta tam adı yazar.</Notice>}
      {usesLegend && <Notice>13 ve üzeri seçenekte dilimlerde numara gösterilir; isimler çarkın altındaki listede.</Notice>}
      <Group title="Turlar" id="cark-tur">
        <Row label="Kazananı sonraki turlardan çıkar">
          <Switch checked={removeWinner} onChange={setRemoveWinner} label="Kazananı sonraki turlardan çıkar" disabled={busy} />
        </Row>
      </Group>
    </>
  )

  const action = (
    <>
      {willRemove && !busy && (
        <p className="actionbar__note">
          {nextCount >= MIN_OPTIONS ? `Sonraki turda “${winner.name}” çarktan çıkarılacak.` : `“${winner.name}” çıkarılınca tek seçenek kalıyor; yeni seçenek ekle ya da ayarı kapat.`}
        </p>
      )}
      <Button variant="primary" size="lg" block onClick={spin} disabled={busy || nextCount < MIN_OPTIONS}>
        {busy ? 'Dönüyor…' : willRemove ? 'Çıkar ve yeniden çevir' : winner ? 'Yeniden çevir' : 'Çarkı çevir'}
      </Button>
    </>
  )

  return (
    <ToolScaffold
      tool="cark"
      topBar={editor.adder}
      stage={stage}
      controls={controls}
      action={action}
      live={live}
      banner={banner}
      rules={[
        'Her seçeneğin çıkma olasılığı eşittir.',
        'Sonuç çark dönmeden önce belirlenir; çark işaretçinin gösterdiği dilimde durur.',
        'Kazananı çıkar açıksa çıkan seçenek, bir sonraki çevirişten önce çarktan kaldırılır.',
        'En az iki seçenek gerekir.',
      ]}
    />
  )
}
