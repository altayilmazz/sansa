import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { makeEntries, type Entry } from '../lib/entries'
import { uid } from '../lib/random'
import { MAX_OPTIONS, MIN_OPTIONS, planSpin } from '../lib/rules/wheel'
import { isEntryList } from '../lib/storage'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { labelBudget, Wheel, type WheelHandle } from '../objects/Wheel'
import { Button, Row, Switch } from '../ui/controls'
import { ColorField } from '../ui/ColorField'
import { useEntryEditor } from '../ui/EntryEditor'
import { useExample } from '../ui/ExampleBanner'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const lumOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}
/** Dilim rengine zıt yazı rengi: koyu zeminde beyaz, açık zeminde siyah. */
const inkOn = (bg: string) => (lumOf(bg) < 0.32 ? '#ffffff' : '#1c1c1e')
const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const m = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return '#' + [16, 8, 0].map((s) => m(s).toString(16).padStart(2, '0')).join('')
}

interface WheelPalette {
  id: string
  name: string
  slots: [string, string, string, string]
}
/** Hazır çok renkli paletler (sistem paleti dışında). */
const PALETTES: WheelPalette[] = [
  { id: 'okyanus', name: 'Okyanus', slots: ['#0ea5e9', '#0c4a6e', '#e0f2fe', '#14b8a6'] },
  { id: 'orman', name: 'Orman', slots: ['#2f855a', '#1b4332', '#f0e9d2', '#b7791f'] },
  { id: 'gunbatimi', name: 'Gün batımı', slots: ['#f97316', '#be123c', '#fde68a', '#6d28d9'] },
]
/** Tek renkli seçenekler: dilimler rengin iki tonu arasında dönüşür. */
const SOLIDS = [
  { id: 'siyah', name: 'Siyah', c: '#1c1c1e' },
  { id: 'kirmizi', name: 'Kırmızı', c: '#d92d3a' },
  { id: 'beyaz', name: 'Beyaz', c: '#f4f4f4' },
  { id: 'mavi', name: 'Mavi', c: '#2563eb' },
  { id: 'gri', name: 'Gri', c: '#8e8e93' },
  { id: 'turuncu', name: 'Turuncu', c: '#f08a24' },
  { id: 'yesil', name: 'Yeşil', c: '#2e9e5b' },
  { id: 'mor', name: 'Mor', c: '#7c4dbd' },
  { id: 'sari', name: 'Sarı', c: '#f2c500' },
  { id: 'pembe', name: 'Pembe', c: '#e0559c' },
]
const solidSlots = (c: string): [string, string, string, string] => {
  const dark = lumOf(c) < 0.32
  const a = dark ? mixHex(c, '#ffffff', 0.28) : mixHex(c, '#000000', 0.3)
  const b = dark ? mixHex(c, '#ffffff', 0.5) : mixHex(c, '#000000', 0.5)
  return [c, a, c, b]
}
const slotsOf = (id: string): [string, string, string, string] | null => {
  const p = PALETTES.find((x) => x.id === id)
  if (p) return p.slots
  const s = SOLIDS.find((x) => x.id === id)
  return s ? solidSlots(s.c) : null
}
const isWheelColor = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && slotsOf(v) !== null)
const conic = (slots: string[]) => `conic-gradient(${slots.map((c, i) => `${c} ${i * 25}% ${(i + 1) * 25}%`).join(', ')})`
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

export function WheelTool() {
  const [options, setOptions] = usePersistent<Entry[]>('cark:list', [], isEntryList)
  // Anahtar yenilendi: eski cihazlarda saklı "kapalı" değeri yeni varsayılanı (açık) ezmesin.
  const [removeWinner, setRemoveWinner] = usePersistent('cark:remove2', true, isBool)
  const [palette, setPalette] = usePersistent('cark:renk', 'sistem', isWheelColor)
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

  const slots = slotsOf(palette)
  const paletteVars = slots
    ? ({
        '--wheel-1': slots[0],
        '--wheel-2': slots[1],
        '--wheel-3': slots[2],
        '--wheel-4': slots[3],
        '--wheel-1t': inkOn(slots[0]),
        '--wheel-2t': inkOn(slots[1]),
        '--wheel-3t': inkOn(slots[2]),
        '--wheel-4t': inkOn(slots[3]),
      } as CSSProperties)
    : undefined

  const stage = (
    <>
      <div className="stage-body wheel-stage" style={paletteVars}>
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
        <>
        <ColorField
          label="Çark renkleri"
          value={palette}
          onChange={setPalette}
          disabled={busy}
          options={[
            { value: 'sistem', label: 'Sistem', style: { background: conic(['var(--wheel-1)', 'var(--wheel-2)', 'var(--wheel-3)', 'var(--wheel-4)']) } },
            ...PALETTES.map((p) => ({ value: p.id, label: p.name, style: { background: conic(p.slots) } })),
            ...SOLIDS.map((c) => ({ value: c.id, label: c.name, style: { background: conic(solidSlots(c.c)) } })),
          ]}
        />
        <Row label="Kazananı çıkar" hint="Sağ alttaki çizgili düğmenin işi: açıkken sonuçtan sonra “Çıkar” ve “Yeniden çevir” düğmeleri görünür.">
          <Switch checked={removeWinner} onChange={setRemoveWinner} label="Kazananı çıkar" disabled={busy} />
        </Row>
        </>
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
