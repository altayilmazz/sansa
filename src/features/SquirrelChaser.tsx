import { useEffect, useRef } from 'react'
import { useMedia, useReducedMotion } from '../state/hooks'
import { useStore } from '../state/store'
import { SquirrelFigure } from '../objects/Squirrel'

const W = 80 // figür genişliği
const H = 64
const MAX_SPEED = 9 // px / kare
const ACCEL = 0.6
const JUMP_REACH = 210 // zeminden bu yüksekliğe kadar imleç "yakalanabilir"
const JUMP_COOLDOWN = 900

/**
 * Masaüstünde ekranın altında yürüyen sincap. İmlecin x konumuna koşar,
 * durunca yukarı bakar, imleç yeterince yaklaşınca zıplayıp yakalamaya çalışır.
 * Tüm hareket requestAnimationFrame ile doğrudan DOM üzerinde yapılır;
 * React her karede yeniden çizim yapmaz. Tıklamaları asla engellemez.
 */
export function SquirrelChaser() {
  const { settings } = useStore()
  const fine = useMedia('(hover: hover) and (pointer: fine)')
  const reduced = useReducedMotion()
  const enabled = settings.squirrel && fine && !reduced

  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const el = root.current
    const fig = body.current
    if (!el || !fig) return
    const head = fig.querySelector<SVGGElement>('.sq-head')

    let x = window.innerWidth * 0.12
    let v = 0
    let facing = 1
    let mouse: { x: number; y: number } | null = null
    let jumpStart = 0
    let jumpH = 0
    let lastJump = 0
    let raf = 0
    let state = ''
    let lastT = 0

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mouse = { x: e.clientX, y: e.clientY }
    }
    const onLeave = () => {
      mouse = null
    }

    const setState = (s: string) => {
      if (s !== state) {
        state = s
        fig.dataset.state = s
      }
    }

    const tick = (t: number) => {
      // Kare hızından bağımsız: 60 Hz karesi = 1 birim
      const k = lastT ? Math.min(3, (t - lastT) / 16.67) : 1
      lastT = t
      const vw = window.innerWidth
      const vh = window.innerHeight
      const target = mouse ? Math.min(vw - W, Math.max(0, mouse.x - W / 2)) : x
      const dx = target - x
      const jumping = jumpStart > 0

      if (!jumping) {
        // hedefe doğru ivmelen, yaklaşınca yavaşla
        const desired = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, dx * 0.12))
        v += Math.max(-ACCEL * k, Math.min(ACCEL * k, desired - v))
        if (Math.abs(dx) < 1.5 && Math.abs(v) < 0.4) v = 0
      } else {
        v *= Math.pow(0.96, k)
      }
      x += v * k
      if (Math.abs(v) > 0.6) facing = v > 0 ? 1 : -1

      // zıplama
      let y = 0
      const fromGround = mouse ? vh - mouse.y : Infinity
      if (!jumping && mouse && Math.abs(dx) < 46 && fromGround < JUMP_REACH && t - lastJump > JUMP_COOLDOWN) {
        jumpStart = t
        jumpH = Math.max(40, Math.min(150, fromGround - H * 0.6))
      }
      if (jumpStart > 0) {
        const dur = 280 + jumpH * 2.2
        const p = (t - jumpStart) / dur
        if (p >= 1) {
          jumpStart = 0
          lastJump = t
        } else {
          y = -4 * jumpH * p * (1 - p)
        }
      }

      // baş imlece baksın
      if (head) {
        let angle = 0
        if (mouse) {
          const hx = x + (facing > 0 ? W * 0.7 : W * 0.3)
          const hy = vh - H * 0.55 + y
          const a = (Math.atan2(mouse.y - hy, (mouse.x - hx) * facing) * 180) / Math.PI
          angle = Math.max(-55, Math.min(20, a))
        }
        head.style.transform = `rotate(${angle}deg)`
      }

      const moving = Math.abs(v) > 0.8
      setState(jumpStart > 0 ? 'jump' : moving ? 'run' : mouse ? 'look' : 'idle')
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      fig.style.transform = `scaleX(${facing})`
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div className="squirrel-lane" aria-hidden="true">
      <div className="squirrel" ref={root}>
        <div className="squirrel__fig" ref={body}>
          <SquirrelFigure />
        </div>
      </div>
    </div>
  )
}
