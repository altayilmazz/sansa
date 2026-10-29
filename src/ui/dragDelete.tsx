import { createContext, useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Icon } from './Icon'

/**
 * "Basılı tut, çöp kutusuna sürükle" silme hareketinin ortak durumu.
 * Çipler hareketi bildirir; alt çubuktaki büyük kırmızı çöp alanı yalnızca
 * sürükleme sürerken görünür. İsabet, işaretçi koordinatıyla ölçülür.
 */
interface DragDelete {
  dragging: boolean
  over: boolean
  zoneRef: RefObject<HTMLDivElement | null>
  begin: () => void
  move: (x: number, y: number) => void
  /** Bırakıldığında çağrılır; çöp alanının üzerinde bırakıldıysa true döner. */
  end: (x: number, y: number) => boolean
}

const Ctx = createContext<DragDelete | null>(null)

export function useDragDelete(): DragDelete | null {
  return useContext(Ctx)
}

export function DragDeleteProvider({ children }: { children: ReactNode }) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState(false)

  const api = useMemo<DragDelete>(() => {
    const hit = (x: number, y: number) => {
      const r = zoneRef.current?.getBoundingClientRect()
      return !!r && x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 14 && y <= r.bottom + 14
    }
    return {
      dragging,
      over,
      zoneRef,
      begin: () => setDragging(true),
      move: (x, y) => setOver(hit(x, y)),
      end: (x, y) => {
        const dropped = hit(x, y)
        setDragging(false)
        setOver(false)
        return dropped
      },
    }
  }, [dragging, over])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

/** Ana eylem düğmesinin üstünü örten çöp alanı (yalnızca sürüklerken görünür). */
export function DeleteZone() {
  const dd = useDragDelete()
  if (!dd) return null
  return (
    <div ref={dd.zoneRef} className={`dz${dd.dragging ? ' is-on' : ''}${dd.over ? ' is-over' : ''}`} aria-hidden="true">
      <Icon name="trash" size={28} />
    </div>
  )
}
