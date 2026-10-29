import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { sample, uid } from '../lib/random'
import { haptic, sfx } from '../features/sound'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Stepper } from '../ui/controls'
import { ToolScaffold } from '../ui/ToolScaffold'

const COLORS = ['#ff453a', '#30d158', '#0a84ff', '#ffd60a', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff6482', '#a2d729', '#ac8e68']
const isNum = (v: unknown): v is number => typeof v === 'number'

interface Finger {
  id: number
  x: number
  y: number
  color: string
}

export function FingerTool() {
  const [winners, setWinners] = usePersistent('parmak:kazanan', 1, isNum)
  const [delay, setDelay] = usePersistent('parmak:sure', 3, isNum)
  const [fingers, setFingers] = useState<Finger[]>([])
  const [picked, setPicked] = useState<number[] | null>(null)
  const [live, setLive] = useState('')
  const field = useRef<HTMLDivElement>(null)
  const colorOf = useRef(new Map<number, string>())
  const { record } = useStore()

  const ids = fingers.map((f) => f.id).join(',')
  const count = fingers.length
  const k = Math.max(1, Math.min(winners, Math.max(1, count - 1)))

  // Parmak kümesi değişince geri sayım yeniden başlar; süre dolunca seçim yapılır.
  useEffect(() => {
    if (picked || count < 2) return
    const t = window.setTimeout(() => {
      // Sonuç süre dolduğu anda belirlenir; çizilen halka yalnızca görüntüdür.
      const chosen = sample(fingers.map((f) => f.id), k).sort((a, b) => a - b)
      setPicked(chosen)
      sfx.win()
      haptic(35)
      const order = fingers.map((f) => f.id)
      const nums = chosen.map((id) => order.indexOf(id) + 1)
      setLive(`${count} parmaktan ${chosen.length} tanesi seçildi.`)
      record(uid(), { tool: 'parmak', title: chosen.length === 1 ? '1 parmak seçildi' : `${chosen.length} parmak seçildi`, detail: `${count} parmaktan seçim (${nums.length ? 'sıra: ' + nums.join(', ') : ''})` })
    }, delay * 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, picked, delay, k])

  const rel = (e: RPointerEvent) => {
    const r = field.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }
  const down = (e: RPointerEvent) => {
    if ((e.target as Element).closest('button')) return
    e.preventDefault()
    try {
      field.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* yakalama desteklenmiyorsa olaylar yine de alandan gelir */
    }
    if (!colorOf.current.has(e.pointerId)) colorOf.current.set(e.pointerId, COLORS[colorOf.current.size % COLORS.length])
    const p = rel(e)
    sfx.tap()
    haptic(8)
    setFingers((f) => (f.some((x) => x.id === e.pointerId) ? f : [...f, { id: e.pointerId, ...p, color: colorOf.current.get(e.pointerId) as string }]))
  }
  const move = (e: RPointerEvent) => {
    const p = rel(e)
    setFingers((f) => (f.some((x) => x.id === e.pointerId) ? f.map((x) => (x.id === e.pointerId ? { ...x, ...p } : x)) : f))
  }
  const up = (e: RPointerEvent) => {
    setFingers((f) => {
      const next = f.filter((x) => x.id !== e.pointerId)
      if (next.length === 0) {
        setPicked(null)
        colorOf.current.clear()
      }
      return next
    })
  }

  const status = picked ? 'Seçildi' : count < 2 ? 'Parmaklarınızı ekrana koyun' : 'Seçiliyor…'

  const stage = (
    <div
      ref={field}
      className="stage-body finger-field"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {fingers.map((f) => {
        const win = picked?.includes(f.id)
        return (
          <span
            key={f.id}
            className={`finger${picked ? (win ? ' is-win' : ' is-out') : ''}`}
            style={{ left: f.x, top: f.y, '--c': f.color, '--t': `${delay}s` } as CSSProperties}
          >
            <span className="finger__ring" key={`${ids}-${picked ? 'p' : 'w'}`} />
          </span>
        )
      })}
      <p className="stage-hint finger__hint" aria-hidden="true">
        {picked ? 'Parmaklarını kaldırınca yeniden başlar' : count === 0 ? 'En az 2 parmağını ekrana koy ve basılı tut' : count === 1 ? 'Bir parmak daha ekle' : `${delay} sn içinde biri seçilecek`}
      </p>
    </div>
  )

  return (
    <ToolScaffold
      tool="parmak"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block disabled>
          {status}
        </Button>
      }
      onReset={() => {
        setFingers([])
        setPicked(null)
        colorOf.current.clear()
        setLive('Sıfırlandı.')
      }}
      resetDisabled={count === 0 && !picked}
      live={live}
      settings={
        <>
          <Row label="Seçilecek parmak sayısı" hint={`En fazla parmak sayısının bir eksiği kadar seçilir (şu an ${k}).`}>
            <Stepper value={winners} min={1} max={9} onChange={setWinners} label="Seçilecek parmak sayısı" />
          </Row>
          <Row label="Bekleme süresi" hint="Parmaklar sabitlendikten sonra seçimin yapılacağı süre.">
            <Stepper value={delay} min={1} max={6} onChange={setDelay} label="Bekleme süresi" format={(n) => `${n} sn`} />
          </Row>
        </>
      }
      rules={[
        'Herkes bir parmağını ekrana koyar; en az iki parmak gerekir.',
        'Parmaklar değişmeden bekleme süresi dolunca rastgele (Web Crypto) olarak seçilen parmak ya da parmaklar belirginleşir.',
        'Biri parmağını kaldırır ya da yeni bir parmak eklenirse geri sayım yeniden başlar.',
        'Bütün parmaklar kalkınca yeni tur başlar. Telefonda çok parmaklı dokunma gerekir; bilgisayarda tek fare imleci olduğu için denenemez.',
      ]}
    />
  )
}

