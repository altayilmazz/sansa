import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../state/hooks'
import { useStore, type Announcement } from '../state/store'
import { TOOLS } from '../state/tools'
import { ToolGlyph } from '../objects/ToolGlyph'

/**
 * Dinamik Ada'lı iPhone ekran ölçüleri (CSS piksel, dikey). Web'de donanımı
 * doğrudan sorgulamanın yolu olmadığından bu yalnızca güçlü bir tahmindir.
 */
const DI_SCREENS = new Set(['393x852', '430x932', '402x874', '440x956', '420x912'])

export function detectDynamicIsland(): { likely: boolean; standalone: boolean } {
  if (typeof window === 'undefined') return { likely: false, standalone: false }
  const ua = navigator.userAgent
  const iphone = /iPhone/.test(ua)
  const w = Math.min(screen.width, screen.height)
  const h = Math.max(screen.width, screen.height)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return { likely: iphone && DI_SCREENS.has(`${w}x${h}`), standalone }
}

/** Donanım adasının ölçüleri (pt ≈ CSS px). */
const PILL = { w: 126, h: 37 }

export function DynamicIsland() {
  const { announcement, settings, dismissAnnouncement } = useStore()
  const reduced = useReducedMotion()
  const [det] = useState(detectDynamicIsland)
  const [shown, setShown] = useState<Announcement | null>(null)
  const [stage, setStage] = useState<'pill' | 'open'>('pill')

  const enabled = settings.island === 'her-zaman' || (settings.island === 'otomatik' && det.likely)
  // Gerçek adanın üstüne oturtma yalnızca tam ekran (ana ekrana eklenmiş) modda anlamlıdır.
  const docked = det.likely && det.standalone

  useEffect(() => {
    if (!enabled || !announcement) return
    setShown(announcement)
    setStage('pill')
    const t1 = setTimeout(() => setStage('open'), reduced ? 0 : 140)
    const t2 = setTimeout(() => setStage('pill'), 3800)
    const t3 = setTimeout(() => {
      setShown(null)
      dismissAnnouncement()
    }, 4400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [announcement, enabled, reduced, dismissAnnouncement])

  if (!enabled) return null
  const open = stage === 'open'
  const spring = reduced ? { duration: 0.15 } : { type: 'spring' as const, bounce: 0.32, duration: 0.55 }

  return (
    <div className={`island-host${docked ? ' is-docked' : ''}`} aria-hidden="true">
      <AnimatePresence>
        {shown && (
          <motion.button
            key={shown.key}
            type="button"
            tabIndex={-1}
            className="island"
            initial={{ width: PILL.w, height: PILL.h, borderRadius: 999, opacity: docked ? 1 : 0, scale: docked ? 1 : 0.8 }}
            animate={{
              width: open ? 'min(360px, calc(100vw - 24px))' : PILL.w,
              height: open ? 76 : PILL.h,
              borderRadius: open ? 30 : 999,
              opacity: 1,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: docked ? 1 : 0.85, transition: { duration: 0.2 } }}
            transition={spring}
            onClick={() => setStage('pill')}
          >
            <AnimatePresence>
              {open && (
                <motion.span
                  className="island__content"
                  initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.92 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, transition: { delay: reduced ? 0 : 0.12, duration: 0.25 } }}
                  exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.92, transition: { duration: 0.12 } }}
                >
                  <span className="island__glyph">
                    <ToolGlyph tool={shown.tool} size={34} />
                  </span>
                  <span className="island__text">
                    <span className="island__tool">{TOOLS[shown.tool].name}</span>
                    <span className="island__headline">{shown.headline}</span>
                  </span>
                  {shown.detail && <span className="island__detail">{shown.detail}</span>}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
