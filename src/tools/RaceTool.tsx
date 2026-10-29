import { motion } from 'motion/react'
import { useState, type CSSProperties } from 'react'
import { uid } from '../lib/random'
import { MAX_HORSES, MIN_HORSES, planRace, type RacePlan } from '../lib/rules/race'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Stepper } from '../ui/controls'
import { StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'
const COLORS = ['#ff453a', '#0a84ff', '#30d158', '#ffd60a', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff6482']

export function RaceTool() {
  const [horses, setHorses] = usePersistent('yaris:at', 6, isNum)
  const n = Math.max(MIN_HORSES, Math.min(MAX_HORSES, horses))
  const [plan, setPlan] = useState<RacePlan | null>(null)
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [marked, setMarked] = useState<number[]>([])
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const start = () =>
    run(async () => {
      // Önce bitiş sırası belirlenir; atlar yalnızca bu sırayla bitirecek şekilde koşar.
      const p = planRace(n)
      setPlan(p)
      setRound((r) => r + 1)
      setPhase('run')
      setLive('')
      haptic(12)
      sfx.whoosh()
      const total = Math.max(...p.durations)
      await wait(reduced ? 150 : total * 1000 + 250)
      if (!mounted.current) return
      setPhase('done')
      sfx.win()
      haptic(30)
      const w = p.order[0] + 1
      setLive(`${w} numaralı at kazandı. Sıralama: ${p.order.slice(0, 3).map((h) => `${h + 1} numara`).join(', ')}.`)
      record(uid(), { tool: 'yaris', title: `${w} numaralı at kazandı`, detail: `${n} at · ilk üç: ${p.order.slice(0, 3).map((h) => h + 1).join(', ')}` })
    })

  const changeCount = (v: number) => {
    setHorses(v)
    setPlan(null)
    setPhase('idle')
    setMarked((m) => m.filter((i) => i < v))
  }

  const winner = phase === 'done' && plan ? plan.order[0] : null

  const stage = (
    <>
      <div className="stage-body race-stage">
        <p className="race__status" aria-hidden="true">
          {winner !== null ? `${winner + 1} numaralı at kazandı!` : phase === 'run' ? 'Yarış sürüyor…' : 'Bir ata dokun, işaretle; sonra yarışı başlat'}
        </p>
        <div className="race" role="group" aria-label="At yarışı pisti" style={{ '--n': n } as CSSProperties}>
          <span className="race__finish" aria-hidden="true" />
          {Array.from({ length: n }, (_, i) => {
            const path = plan?.paths[i]
            const isMarked = marked.includes(i)
            return (
              <div key={i} className={`lane${winner === i ? ' is-win' : ''}${isMarked ? ' is-marked' : ''}`}>
                <div className="lane__track">
                  <motion.div
                    key={`${round}-${i}`}
                    className="horse"
                    style={{ '--c': COLORS[i], left: 0 } as CSSProperties}
                    initial={false}
                    animate={
                      phase === 'idle' || !path
                        ? { left: '0%' }
                        : reduced
                          ? { left: `${path.x[path.x.length - 1] * 100}%` }
                          : { left: path.x.map((v) => `${v * 100}%`) }
                    }
                    transition={
                      phase === 'idle' || !path || reduced
                        ? { duration: 0 }
                        : { duration: plan.durations[i], times: path.times, ease: 'linear' }
                    }
                  >
                    <button
                      type="button"
                      className="horse__btn"
                      aria-pressed={isMarked}
                      aria-label={`${i + 1} numaralı at${isMarked ? ', işaretli' : ''}`}
                      disabled={busy}
                      onClick={() => setMarked((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))}
                    >
                      {i + 1}
                    </button>
                  </motion.div>
                </div>
              </div>
            )
          })}
        </div>
        {phase === 'done' && plan && (
          <p className="race__podium" aria-hidden="true">
            {plan.order
              .slice(0, 3)
              .map((h, r) => `${r + 1}. ${h + 1}`)
              .join('  ·  ')}
          </p>
        )}
      </div>
      <StageBar
        center={<Stepper value={n} min={MIN_HORSES} max={MAX_HORSES} onChange={changeCount} label="At sayısı" disabled={busy} format={(v) => `${v} at`} />}
      />
    </>
  )

  return (
    <ToolScaffold
      tool="yaris"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block onClick={start} disabled={busy}>
          {busy ? 'Yarış sürüyor…' : phase === 'done' ? 'Yeniden yarış' : 'Yarışı başlat'}
        </Button>
      }
      onReset={() => {
        setPlan(null)
        setPhase('idle')
        setMarked([])
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || (phase === 'idle' && marked.length === 0)}
      live={live}
      settings={
        <Row label="At sayısı" hint="Sahnedeki − ve + düğmelerinin işi.">
          <Stepper value={n} min={MIN_HORSES} max={MAX_HORSES} onChange={changeCount} label="At sayısı" disabled={busy} format={(v) => `${v} at`} />
        </Row>
      }
      rules={[
        'Her atın kazanma olasılığı eşittir.',
        'Bitiş sırası yarış başlamadan önce Web Crypto ile belirlenir; atlar yarışırken öne geçip geri düşebilir ama sıralama değişmez.',
        'Bir ata dokunarak onu işaretleyebilirsin; işaretli at kazanırsa şeridi parlar. Birden fazla at işaretlenebilir.',
        'At sayısı 3 ile 8 arasındadır.',
      ]}
    />
  )
}
