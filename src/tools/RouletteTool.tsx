import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react'
import { useState } from 'react'
import { uid } from '../lib/random'
import { CHAMBERS, load, MAX_BULLETS, MIN_BULLETS, pull, type Revolver } from '../lib/rules/roulette'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Stepper } from '../ui/controls'
import { StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'
const STEP = 360 / CHAMBERS

export function RouletteTool() {
  const [bullets, setBullets] = usePersistent('rulet:mermi', 1, isNum)
  const [game, setGame] = useState<Revolver>(() => load(bullets))
  const [flash, setFlash] = useState<'bang' | 'click' | null>(null)
  const [live, setLive] = useState('')
  // Tamburun görünen dönüşü: o an namlunun karşısındaki yuva en üstte durur.
  const rot = useMotionValue(-game.pos * STEP)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const reload = (n = bullets) =>
    run(async () => {
      const g = load(n)
      setFlash(null)
      setLive('')
      sfx.whoosh()
      haptic(12)
      // Tambur rastgele bir konuma döndürülür; yuva konumu önceden belirlenmiştir.
      const base = Math.floor(rot.get() / 360) * 360
      await animate(rot, reduced ? -g.pos * STEP : base - 720 - g.pos * STEP, { duration: reduced ? 0.2 : 1.1, ease: [0.2, 0.8, 0.2, 1] })
      rot.set(-g.pos * STEP)
      setGame(g)
      setLive('Silah yüklendi, tambur döndürüldü.')
    })

  const trigger = () =>
    run(async () => {
      if (game.state !== 'play') return
      // Sonuç tetik çekilmeden önce belirlidir.
      const next = pull(game)
      haptic(10)
      sfx.tick()
      await wait(reduced ? 80 : 420)
      if (!mounted.current) return
      if (next.state === 'bang') {
        setFlash('bang')
        setGame(next)
        sfx.win()
        haptic(60)
        setLive(`BANG. Mermi ${next.pulls}. çekişte çıktı. Oyun bitti.`)
        record(uid(), { tool: 'rulet', title: 'Rus ruleti: BANG', detail: `${bullets} mermi · ${next.pulls}. çekişte` })
        return
      }
      setFlash('click')
      sfx.tap()
      setLive('Tık. Yuva boş.')
      await wait(reduced ? 60 : 380)
      if (!mounted.current) return
      await animate(rot, rot.get() - STEP, { duration: reduced ? 0.1 : 0.35, ease: [0.3, 0.7, 0.2, 1] })
      setGame(next)
      setFlash(null)
    })

  const over = game.state === 'bang'

  const stage = (
    <>
      <div className="stage-body rulet-stage">
        <div className="rulet">
          <span className="rulet__pointer" aria-hidden="true" />
          <motion.svg className="rulet__cyl" viewBox="-100 -100 200 200" style={{ rotate: rot }} aria-hidden="true">
            <circle r="96" className="rulet__body" />
            <circle r="22" className="rulet__hub" />
            {Array.from({ length: CHAMBERS }, (_, i) => {
              const a = (i * STEP * Math.PI) / 180
              const x = 58 * Math.sin(a)
              const y = -58 * Math.cos(a)
              const live = over && game.chambers[i]
              return <circle key={i} cx={x} cy={y} r="19" className={`rulet__hole${live ? ' is-live' : ''}`} />
            })}
          </motion.svg>
          <AnimatePresence>
            {flash && (
              <motion.span
                key={flash}
                className={`rulet__flash is-${flash}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {flash === 'bang' ? 'BANG!' : 'Tık'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="stage-hint" aria-hidden="true">
          {over ? 'Mermi çıktı! Yeniden yüklemek için alttaki düğmeye bas' : `${game.pulls} kez çekildi · ${bullets} mermi, ${CHAMBERS} yuva`}
        </p>
      </div>
      <StageBar
        center={
          <Stepper
            value={bullets}
            min={MIN_BULLETS}
            max={MAX_BULLETS}
            onChange={(n) => {
              setBullets(n)
              reload(n)
            }}
            label="Mermi sayısı"
            disabled={busy}
            format={(n) => `${n} mermi`}
          />
        }
      />
    </>
  )

  return (
    <ToolScaffold
      tool="rulet"
      stage={stage}
      action={
        over ? (
          <Button variant="primary" size="lg" block icon="refresh" onClick={() => reload()} disabled={busy}>
            Yeniden yükle
          </Button>
        ) : (
          <Button variant="primary" size="lg" block onClick={trigger} disabled={busy}>
            {busy ? '…' : 'Tetiği çek'}
          </Button>
        )
      }
      onReset={() => reload()}
      resetDisabled={busy}
      live={live}
      settings={
        <Row label="Mermi sayısı" hint="Sahnedeki − ve + düğmelerinin işi. Değişince silah yeniden yüklenir.">
          <Stepper value={bullets} min={MIN_BULLETS} max={MAX_BULLETS} onChange={(n) => (setBullets(n), reload(n))} label="Mermi sayısı" disabled={busy} format={(n) => `${n} mermi`} />
        </Row>
      }
      rules={[
        'Tamburda 6 yuva vardır; seçtiğin sayıda mermi rastgele yuvalara konur ve tambur rastgele bir konuma döndürülür.',
        'Tetiği her çekişte namlunun karşısındaki yuva ateşlenir: mermi varsa oyun biter, boşsa tambur bir yuva ilerler.',
        'Mermilerin yeri oyun başında belirlenir ve hiçbir ipucuyla anlaşılamaz.',
        'Bu bir şans ve eğlence oyunudur; gerçek bir şeyin simülasyonu olarak ya da bahis için kullanılmamalıdır.',
      ]}
    />
  )
}
