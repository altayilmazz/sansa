import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { uid } from '../lib/random'
import { fuseMs } from '../lib/rules/party'
import { haptic, sfx } from '../features/sound'
import { useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Segmented } from '../ui/controls'
import { ToolScaffold } from '../ui/ToolScaffold'

type Len = 'kisa' | 'orta' | 'uzun'
const LENS: Record<Len, number> = { kisa: 15, orta: 30, uzun: 60 }
const isLen = (v: unknown): v is Len => v === 'kisa' || v === 'orta' || v === 'uzun'

export function FuseTool() {
  const [len, setLen] = usePersistent<Len>('sicak:sure', 'orta', isLen)
  const [phase, setPhase] = useState<'idle' | 'burn' | 'boom'>('idle')
  const [beat, setBeat] = useState(0)
  const [live, setLive] = useState('')
  const reduced = useReducedMotion()
  const timers = useRef<number[]>([])
  const { record } = useStore()

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clear, [])

  const start = () => {
    clear()
    // Patlama süresi başlarken belirlenir; tıkırtı hızı süreyi ele vermez, yalnızca geçen zamana bağlıdır.
    const ms = fuseMs(LENS[len])
    const t0 = performance.now()
    setPhase('burn')
    setLive('Patates yandı. Telefonu elden ele geçirin.')
    sfx.whoosh()
    haptic(15)
    const tick = () => {
      const el = (performance.now() - t0) / 1000
      setBeat((b) => b + 1)
      sfx.tick()
      haptic(6)
      timers.current.push(window.setTimeout(tick, Math.max(170, 720 - el * 22)))
    }
    timers.current.push(window.setTimeout(tick, 500))
    timers.current.push(
      window.setTimeout(() => {
        clear()
        setPhase('boom')
        sfx.win()
        haptic(90)
        setLive('Patates patladı!')
        record(uid(), { tool: 'sicak', title: 'Sıcak patates patladı', detail: `${(ms / 1000).toFixed(1)} sn sonra` })
      }, ms),
    )
  }

  const reset = () => {
    clear()
    setPhase('idle')
    setLive('Sıfırlandı.')
  }

  const stage = (
    <div className="stage-body fuse-stage">
      <div className={`potato is-${phase}`} key={phase === 'burn' ? `b${beat % 2}` : phase} aria-hidden="true">
        <motion.span className="potato__body" animate={phase === 'burn' && !reduced ? { scale: [1, 1.07, 1] } : { scale: 1 }} transition={{ duration: 0.16 }}>
          {phase === 'boom' ? '💥' : '🥔'}
        </motion.span>
      </div>
      <p className="stage-hint" aria-hidden="true">
        {phase === 'idle' ? 'Patatesi yak, telefonu elden ele geçirin' : phase === 'burn' ? 'Elinde tutma, ver gitsin!' : 'Patladı! Elinde kalan kaybeder'}
      </p>
    </div>
  )

  return (
    <ToolScaffold
      tool="sicak"
      stage={stage}
      action={
        phase === 'burn' ? (
          <Button variant="primary" size="lg" block disabled>
            Geçirin…
          </Button>
        ) : (
          <Button variant="primary" size="lg" block onClick={start}>
            {phase === 'boom' ? 'Yeniden başlat' : 'Patatesi yak'}
          </Button>
        )
      }
      onReset={reset}
      resetDisabled={phase === 'idle'}
      live={live}
      settings={
        <Row label="Süre" hint={`Patlama zamanı 3 sn ile en çok ${LENS[len]} sn arasında rastgele belirlenir.`}>
          <Segmented<Len>
            label="Süre"
            value={len}
            onChange={setLen}
            disabled={phase === 'burn'}
            options={[
              { value: 'kisa', label: 'Kısa' },
              { value: 'orta', label: 'Orta' },
              { value: 'uzun', label: 'Uzun' },
            ]}
          />
        </Row>
      }
      rules={[
        'Patatesi yakınca gizli bir süre başlar; süre 3 saniye ile seçilen üst sınır arasında rastgele (Web Crypto) belirlenir ve kimse ne zaman biteceğini bilemez.',
        'Oyuncular telefonu elden ele geçirir. Tıkırtı süre geçtikçe sıklaşır; bu yalnızca geçen zamana bağlıdır, kalan süreyi ele vermez.',
        'Patates patladığında telefon kimin elindeyse o kaybeder.',
      ]}
    />
  )
}
