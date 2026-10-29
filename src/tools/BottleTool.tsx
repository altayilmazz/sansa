import { animate, motion, useMotionValue } from 'motion/react'
import { useRef, useState, type CSSProperties } from 'react'
import { fraction, cryptoInt, uid } from '../lib/random'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button } from '../ui/controls'
import { ColorField } from '../ui/ColorField'
import { ToolScaffold } from '../ui/ToolScaffold'

const COLORS = [
  { id: 'yesil', name: 'Yeşil', c: '#2e9e5b' },
  { id: 'mavi', name: 'Mavi', c: '#3b82f6' },
  { id: 'kahve', name: 'Kahverengi', c: '#8a5a2b' },
  { id: 'kirmizi', name: 'Kırmızı', c: '#d92d3a' },
  { id: 'mor', name: 'Mor', c: '#8e4ec6' },
  { id: 'berrak', name: 'Berrak', c: '#cfe3ea' },
]
const isColor = (v: unknown): v is string => v === 'sistem' || (typeof v === 'string' && COLORS.some((c) => c.id === v))

export function BottleTool() {
  const [color, setColor] = usePersistent('sise:renk', 'sistem', isColor)
  const angle = useMotionValue(0)
  const [stopped, setStopped] = useState(false)
  const [live, setLive] = useState('')
  const total = useRef(0)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()
  const picked = COLORS.find((c) => c.id === color)

  const spin = () =>
    run(async () => {
      // Önce duruş açısı belirlenir; şişe yalnızca oraya döner.
      const final = fraction() * 360
      const turns = 3 + cryptoInt(3)
      const target = total.current + turns * 360 + ((final - (total.current % 360) + 360) % 360)
      total.current = target
      setStopped(false)
      setLive('')
      haptic(12)
      sfx.whoosh()
      await animate(angle, target, reduced ? { duration: 0.4 } : { duration: 3.2 + fraction() * 1.2, ease: [0.2, 0.7, 0.15, 1] })
      if (!mounted.current) return
      setStopped(true)
      sfx.win()
      haptic(25)
      const deg = Math.round(((target % 360) + 360) % 360)
      setLive(`Şişe durdu, ağzı ${deg} derece yönünü gösteriyor.`)
      record(uid(), { tool: 'sise', title: 'Şişe çevrildi', detail: `Ağzı ${deg}° yönünde durdu` })
    })

  const stage = (
    <div className="stage-body bottle-stage" style={picked ? ({ '--bottle': picked.c } as CSSProperties) : undefined}>
      <button type="button" className="object-hit bottle-hit" onClick={spin} disabled={busy} aria-label="Şişeyi çevir">
        <span className={`bottle__mark${stopped ? ' is-on' : ''}`} aria-hidden="true" />
        <motion.svg className="bottle" viewBox="0 0 60 200" style={{ rotate: angle }} aria-hidden="true">
          <path className="bottle__body" d="M24 4h12v8c0 6 1 10 4 16 6 10 10 16 10 30v120a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10V58c0-14 4-20 10-30 3-6 4-10 4-16z" />
          <rect className="bottle__cap" x="23" y="2" width="14" height="9" rx="2" />
          <rect className="bottle__label" x="14" y="92" width="32" height="46" rx="3" />
          <path className="bottle__shine" d="M17 62v110" />
        </motion.svg>
      </button>
      <p className="stage-hint" aria-hidden="true">
        {busy ? ' ' : stopped ? 'Şişenin ağzı kime bakıyorsa o!' : 'Şişeyi çevirmek için dokun'}
      </p>
    </div>
  )

  return (
    <ToolScaffold
      tool="sise"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block onClick={spin} disabled={busy}>
          {busy ? 'Dönüyor…' : stopped ? 'Yeniden çevir' : 'Şişeyi çevir'}
        </Button>
      }
      onReset={() => {
        setStopped(false)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || !stopped}
      live={live}
      settings={
        <ColorField
          label="Şişe rengi"
          value={color}
          onChange={setColor}
          disabled={busy}
          options={[{ value: 'sistem', label: 'Sistem', style: { background: 'var(--accent)' } }, ...COLORS.map((c) => ({ value: c.id, label: c.name, style: { background: c.c } }))]}
        />
      }
      rules={[
        'Şişenin duruş yönü, dönmeye başlamadan önce Web Crypto ile belirlenir; her yön eşit olasılıklıdır.',
        'Şişe hep aynı yönde, birkaç tur atıp o yönde yavaşlayarak durur.',
        'Şişenin ağzı kimi ya da neyi gösteriyorsa o seçilmiş olur; kurallar kendi aranızda.',
      ]}
    />
  )
}
