import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { uid } from '../lib/random'
import { checkRange, generate, LIMIT, MAX_COUNT } from '../lib/rules/number'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Notice, Row, Stepper, Switch } from '../ui/controls'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const PRESETS: [number, number][] = [
  [1, 10],
  [1, 100],
  [1, 1000],
  [0, 9999],
]

/** Metni tam sayıya çevirir; geçersizse null. */
const parseInt10 = (s: string): number | null => {
  const t = s.trim()
  return /^-?\d+$/.test(t) ? Number(t) : null
}

export function NumberTool() {
  const [minS, setMinS] = usePersistent('sayi:min', '1', isStr)
  const [maxS, setMaxS] = usePersistent('sayi:max', '100', isStr)
  const [count, setCount] = usePersistent('sayi:adet', 1, isNum)
  const [unique, setUnique] = usePersistent('sayi:tekrarsiz', true, isBool)
  const [result, setResult] = useState<number[] | null>(null)
  const [shown, setShown] = useState<number[] | null>(null)
  const [round, setRound] = useState(0)
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const min = parseInt10(minS)
  const max = parseInt10(maxS)
  const check = min === null || max === null ? ({ ok: false, error: 'En az ve en çok değerlerine tam sayı yaz.' } as const) : checkRange(min, max, count, unique)

  // Aralık ya da seçenekler değişince eski sonuç geçersizdir.
  useEffect(() => {
    if (!busy) {
      setResult(null)
      setShown(null)
    }
  }, [minS, maxS, count, unique])

  const roll = () =>
    run(async () => {
      if (!check.ok || min === null || max === null) return
      // Önce sonuç hesaplanır; görünen "dönen" sayılar yalnızca süstür.
      const out = generate(min, max, count, unique)
      const key = uid()
      setLive('')
      setResult(null)
      haptic(10)
      sfx.whoosh()
      if (!reduced) {
        for (let i = 0; i < 9; i++) {
          setShown(Array.from({ length: count }, () => min + Math.floor(Math.random() * (max - min + 1))))
          sfx.tick()
          await wait(70 + i * 12)
          if (!mounted.current) return
        }
      }
      setShown(null)
      setResult(out)
      setRound((r) => r + 1)
      sfx.win()
      haptic(25)
      setLive(`Rastgele sayı${out.length > 1 ? 'lar' : ''}: ${out.join(', ')}.`)
      record(key, { tool: 'sayi', title: out.length === 1 ? String(out[0]) : out.join(', '), detail: `${min} ile ${max} arası${out.length > 1 ? `, ${out.length} sayı${unique ? ', tekrarsız' : ''}` : ''}` })
    })

  const list = shown ?? result
  const big = !list || list.length === 1

  const stage = (
    <>
      <div className="stage-body number-stage">
        <button type="button" className="object-hit number-hit" onClick={roll} disabled={busy || !check.ok} aria-label="Sayı üret">
          <AnimatePresence mode="wait" initial={false}>
            {list ? (
              <motion.ol
                key={shown ? 'rolling' : `r${round}`}
                className={`numbers${big ? ' numbers--big' : ''}${shown ? ' is-rolling' : ''}`}
                initial={shown || reduced ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                aria-hidden="true"
              >
                {list.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </motion.ol>
            ) : (
              <motion.p key="hint" className="stage-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {check.ok ? 'Sayı üretmek için dokun' : 'Önce aralığı düzelt'}
              </motion.p>
            )}
          </AnimatePresence>
        </button>
        {!check.ok && <Notice tone="error">{check.error}</Notice>}
      </div>
      <StageBar
        center={<Stepper value={count} min={1} max={MAX_COUNT} onChange={setCount} label="Kaç sayı" disabled={busy} format={(n) => `${n} sayı`} />}
        right={<RoundButton label={unique ? 'Tekrarsız: açık' : 'Tekrarsız: kapalı'} icon="strike" on={unique} disabled={busy || count < 2} onClick={() => setUnique(!unique)} />}
      />
    </>
  )

  const adder = (
    <form
      className="range"
      onSubmit={(e) => {
        e.preventDefault()
        roll()
      }}
    >
      <label className="range__field">
        <span>En az</span>
        <input className="field" inputMode="numeric" value={minS} disabled={busy} onChange={(e) => setMinS(e.target.value)} aria-invalid={min === null} />
      </label>
      <label className="range__field">
        <span>En çok</span>
        <input className="field" inputMode="numeric" value={maxS} disabled={busy} onChange={(e) => setMaxS(e.target.value)} aria-invalid={max === null} />
      </label>
    </form>
  )

  const action = (
    <Button variant="primary" size="lg" block onClick={roll} disabled={busy || !check.ok}>
      {busy ? 'Üretiliyor…' : result ? 'Yeniden üret' : count > 1 ? `${count} sayı üret` : 'Sayı üret'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="sayi"
      stage={stage}
      action={action}
      adder={adder}
      onReset={() => {
        setMinS('1')
        setMaxS('100')
        setCount(1)
        setResult(null)
        setShown(null)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy}
      live={live}
      settings={
        <>
          <Row label="Kaç sayı" hint="Sahnedeki − ve + düğmelerinin işi.">
            <Stepper value={count} min={1} max={MAX_COUNT} onChange={setCount} label="Kaç sayı" disabled={busy} format={(n) => `${n} sayı`} />
          </Row>
          <Row label="Tekrarsız" hint="Sağ alttaki çizgili düğmenin işi: açıkken aynı sayı bir daha çıkmaz.">
            <Switch checked={unique} onChange={setUnique} label="Tekrarsız" disabled={busy || count < 2} />
          </Row>
          <Row label="Hazır aralıklar" hint="Dokununca en az ve en çok değerleri dolar.">
            <span className="chips-row">
              {PRESETS.map(([a, b]) => (
                <button key={`${a}-${b}`} type="button" className="chip-btn" disabled={busy} onClick={() => (setMinS(String(a)), setMaxS(String(b)))}>
                  {a}–{b}
                </button>
              ))}
            </span>
          </Row>
        </>
      }
      rules={[
        'Aralıktaki her tam sayının çıkma olasılığı eşittir; uçlar (en az ve en çok) dahildir.',
        'Sonuç, sayılar dönmeye başlamadan önce Web Crypto ile belirlenir; dönen rakamlar yalnızca görüntüdür.',
        `En az ve en çok değerleri tam sayı olmalı ve en fazla ${LIMIT.toLocaleString('tr-TR')} olabilir; negatif sayılar kullanılabilir.`,
        'Birden fazla sayı üretirken “tekrarsız” açıksa hiçbir sayı iki kez çıkmaz; bunun için aralık yeterince geniş olmalı.',
      ]}
    />
  )
}
