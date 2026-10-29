import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { ToolGlyph } from '../objects/ToolGlyph'
import { useReducedMotion } from '../state/hooks'
import { setPendingExample, type Example } from '../state/examples'
import { href } from '../state/router'
import { TOOL_ORDER, TOOLS, type ToolId } from '../state/tools'
import { TeamsTool } from '../tools/TeamsTool'
import { Icon } from '../ui/Icon'
import { ToolHostContext } from '../ui/ToolHost'

const WheelTool = lazy(() => import('../tools/WheelTool').then((m) => ({ default: m.WheelTool })))
const DrawTool = lazy(() => import('../tools/DrawTool').then((m) => ({ default: m.DrawTool })))
const CoinTool = lazy(() => import('../tools/CoinTool').then((m) => ({ default: m.CoinTool })))
const DiceTool = lazy(() => import('../tools/DiceTool').then((m) => ({ default: m.DiceTool })))
const CardTool = lazy(() => import('../tools/CardTool').then((m) => ({ default: m.CardTool })))

function ToolView({ tool }: { tool: ToolId }) {
  switch (tool) {
    case 'takim':
      return <TeamsTool />
    case 'cark':
      return <WheelTool />
    case 'kura':
      return <DrawTool />
    case 'para':
      return <CoinTool />
    case 'zar':
      return <DiceTool />
    case 'kart':
      return <CardTool />
  }
}

/** Kapalı blok: başlık, kısa açıklama ve araca giden bağlantı. */
function TileFace({ id }: { id: ToolId }) {
  const meta = TOOLS[id]
  return (
    <a className="tile__link" href={href({ name: 'tool', tool: id })} aria-label={`${meta.name}: ${meta.blurb}`}>
      <span className="tile__art" aria-hidden="true">
        <ToolGlyph tool={id} size={72} />
      </span>
      <span className="tile__text" aria-hidden="true">
        <span className="tile__name">
          <span className="tn-full">{meta.name}</span>
          <span className="tn-short">{meta.short}</span>
        </span>
        <span className="tile__blurb">{meta.blurb}</span>
      </span>
      <span className="tile__go" aria-hidden="true">
        <Icon name="chevronRight" size={18} />
      </span>
    </a>
  )
}

/**
 * Altı aracın blokları. Hiçbiri seçili değilken ızgara olarak durur. Biri
 * seçilince o blok büyüyerek açılır, diğerleri sağında (dar ekranda üstünde)
 * sırayla dizilir. Başka bir bloğa tıklayınca iki blok yer değiştirir.
 * Tüm hareket tek bir `layout` animasyonudur; sonuçlara dokunmaz.
 */
export function Board({ selected }: { selected: ToolId | null }) {
  const reduced = useReducedMotion()
  // Örnek yüklenince aracı baştan kurmak için artan sayaç
  const [nonce, setNonce] = useState(0)
  const open = selected !== null

  const host = useMemo(
    () => ({
      loadExample: (e: Example) => {
        setPendingExample(e)
        setNonce((n) => n + 1)
      },
    }),
    [],
  )

  const layoutTransition = reduced ? { duration: 0 } : { type: 'spring' as const, bounce: 0.08, duration: 0.62 }

  return (
    <ToolHostContext.Provider value={host}>
      <div className={`board${open ? ' is-open' : ''}`}>
        {!open && (
          <header className="board__intro">
            <h1 className="board__title">Belirle</h1>
          </header>
        )}
        <div className="board__grid">
          {TOOL_ORDER.map((id) => {
            const isOpen = id === selected
            return (
              <motion.section
                key={id}
                layout={!reduced}
                transition={{ layout: layoutTransition }}
                // Köşe yarıçapı style ile verilir ki animasyon sırasında bozulmasın.
                style={{ borderRadius: 24 }}
                className={`block ${isOpen ? 'block--open' : 'block--tile'}`}
                aria-label={isOpen ? TOOLS[id].name : undefined}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="panel"
                      className="block__panel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.3, duration: 0.25 } }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    >
                      <div className="panel-scroll">
                        <Suspense fallback={<div className="loading" aria-busy="true" />}>
                          <ToolView key={nonce} tool={id} />
                        </Suspense>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tile"
                      className="block__tile"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.22, duration: 0.25 } }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    >
                      <TileFace id={id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            )
          })}
        </div>
      </div>
    </ToolHostContext.Provider>
  )
}
