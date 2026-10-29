import { useAnimate } from 'motion/react'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { Face } from '../lib/rules/coin'
import { SquirrelEmblem } from './Squirrel'

export interface CoinHandle {
  /** Sonuç önceden belirlenmiştir; animasyon yalnızca bu yüzü gösterecek şekilde biter. */
  flip(face: Face, reduced: boolean): Promise<void>
}

const mod = (x: number, m: number) => ((x % m) + m) % m

export const Coin = forwardRef<CoinHandle, { size?: number }>(function Coin({ size = 180 }, ref) {
  const [scope, animate] = useAnimate()
  const rot = useRef(0)

  useImperativeHandle(ref, () => ({
    async flip(face, reduced) {
      const desired = face === 'yazi' ? 0 : 180
      const body = scope.current.querySelector('.coin__body') as HTMLElement
      const shadow = scope.current.querySelector('.coin__shadow') as HTMLElement
      if (reduced) {
        const target = rot.current + mod(desired - rot.current, 360)
        await animate(body, { opacity: [1, 0.2] }, { duration: 0.15 })
        body.style.transform = `rotateX(${target}deg)`
        await animate(body, { opacity: [0.2, 1] }, { duration: 0.15 })
        rot.current = target
        return
      }
      const target = rot.current + 360 * 5 + mod(desired - rot.current, 360)
      const lift = -Math.min(220, size * 1.25)
      const d = 1.25
      await Promise.all([
        // kısa beklenti: önce hafifçe çökme
        animate(body, { y: [0, 8, lift, 0], scale: [1, 0.96, 1.12, 1] }, { duration: d, times: [0, 0.1, 0.5, 1], ease: ['easeOut', 'easeOut', 'easeIn'] }),
        animate(body, { rotateX: [rot.current, rot.current, target] }, { duration: d, times: [0, 0.1, 1], ease: [0, 0, 0.3, 1] }),
        animate(shadow, { scale: [1, 1.05, 0.45, 1], opacity: [0.6, 0.65, 0.2, 0.6] }, { duration: d, times: [0, 0.1, 0.5, 1] }),
      ])
      // yere değdiğinde küçük bir sekme
      await animate(body, { y: [0, -10, 0] }, { duration: 0.28, ease: 'easeOut' })
      // Son açıyı açıkça yaz: animasyon atlansa bile görünen yüz sonuçla aynı kalır.
      body.style.transform = `rotateX(${target}deg)`
      rot.current = target
    },
  }))

  return (
    <div ref={scope} className="coin" style={{ width: size, height: size }}>
      <div className="coin__shadow" />
      <div className="coin__body">
        {[-1, 0, 1].map((z) => (
          <div key={z} className="coin__edge" style={{ transform: `translateZ(${z * 1.4}px)` }} />
        ))}
        <div className="coin__face coin__face--yazi">
          <div className="coin__ring">
            <span className="coin__num">1</span>
            <span className="coin__word">Yazı</span>
          </div>
        </div>
        <div className="coin__face coin__face--tura">
          <div className="coin__ring">
            <SquirrelEmblem size={size * 0.42} color="#2d3b4d" />
            <span className="coin__word">Tura</span>
          </div>
        </div>
      </div>
    </div>
  )
})
