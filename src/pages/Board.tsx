import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ToolGlyph } from '../objects/ToolGlyph'
import { useMedia, useReducedMotion } from '../state/hooks'
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

/**
 * Blok yüzü: başlık, kısa açıklama ve araca giden bağlantı. Dar ekranda seçili
 * sekme bağlantı olmaz, yalnızca seçili olduğunu gösterir; araç adı panelde
 * yazmaz, seçili sekme anlatır.
 */
function TileFace({ id, selected }: { id: ToolId; selected?: boolean }) {
  const meta = TOOLS[id]
  if (selected) {
    return (
      <span className="tile__link" aria-current="true" aria-label={`${meta.name}, seçili`}>
        <span className="tile__art" aria-hidden="true">
          <ToolGlyph tool={id} size={72} />
        </span>
        <span className="tile__text" aria-hidden="true">
          <span className="tile__name">
            <span className="tn-full">{meta.name}</span>
            <span className="tn-short">{meta.short}</span>
          </span>
        </span>
      </span>
    )
  }
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

const radii = (tl: number, tr: number, br: number, bl: number): CSSProperties => ({
  borderTopLeftRadius: tl,
  borderTopRightRadius: tr,
  borderBottomRightRadius: br,
  borderBottomLeftRadius: bl,
})

/**
 * Altı aracın blokları.
 *
 * Geniş ekran: blok büyüyerek pencereye dönüşür, diğerleri sağında sütun olur;
 * başka bir bloğa tıklayınca ikisi yer değiştirir.
 *
 * Dar ekran: altı blok içeriğin altında sekme şeridine dizilir (başparmakla
 * erişim için). Seçili sekme şeritte kalır ve üstündeki panel o sekmeden yukarı
 * doğru büyüyerek açılır.
 *
 * Hareket yalnızca görünümdür; sonuçlara dokunmaz.
 */
export function Board({ selected }: { selected: ToolId | null }) {
  const reduced = useReducedMotion()
  const wide = useMedia('(min-width: 860px)')
  // Örnek yüklenince aracı baştan kurmak için artan sayaç
  const [nonce, setNonce] = useState(0)
  const open = selected !== null
  // İlk çizimde (doğrudan bağlantıyla açılışta) giriş animasyonu oynatılmaz.
  const first = useRef(true)
  useEffect(() => {
    first.current = false
  }, [])

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
  const tool = (id: ToolId) => (
    <div className="panel-scroll">
      <Suspense fallback={<div className="loading" aria-busy="true" />}>
        <ToolView key={nonce} tool={id} />
      </Suspense>
    </div>
  )

  /* ───────── Geniş ekran: büyüyen blok + sağda sütun ───────── */
  if (wide) {
    return (
      <ToolHostContext.Provider value={host}>
        <div className={`board${open ? ' is-open' : ''}`}>
          <h1 className="sr-only">Şansa</h1>
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
                        {tool(id)}
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

  /* ───────── Dar ekran: altta sekme şeridi + sekmeden yukarı büyüyen panel ───────── */
  const idx = selected ? TOOL_ORDER.indexOf(selected) : -1
  const n = TOOL_ORDER.length
  // Panel, seçili sekmenin yatay aralığından başlayıp tüm genişliğe açılır.
  const left = (idx / n) * 100
  const right = ((n - 1 - idx) / n) * 100

  return (
    <ToolHostContext.Provider value={host}>
      <div className={`board${open ? ' is-open' : ''}`}>
        <h1 className="sr-only">Şansa</h1>
        <div className="board__grid">
          {TOOL_ORDER.map((id) => {
            const sel = id === selected
            return (
              <motion.section
                key={id}
                layout={!reduced}
                transition={{ layout: layoutTransition }}
                style={
                  {
                    ...(open ? radii(sel ? 0 : 16, sel ? 0 : 16, 16, 16) : radii(24, 24, 24, 24)),
                    '--tint': TOOLS[id].tint,
                  } as CSSProperties
                }
                className={`block block--tile${sel ? ' is-selected' : ''}`}
              >
                <motion.div
                  // Düzen değişirken yüz bir an gizlenir; yeni düzende yumuşakça belirir.
                  key={open ? 'strip' : 'home'}
                  className="block__tile"
                  initial={first.current ? false : { opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.2, duration: 0.2 } }}
                >
                  <TileFace id={id} selected={sel} />
                </motion.div>
              </motion.section>
            )
          })}

          <AnimatePresence mode="popLayout" initial={false}>
            {selected && (
              <motion.section
                key={selected}
                className="block block--panel"
                aria-label={TOOLS[selected].name}
                style={radii(24, 24, idx === n - 1 ? 0 : 24, idx === 0 ? 0 : 24)}
                initial={reduced ? { opacity: 0 } : { clipPath: `inset(100% ${right}% 0% ${left}% round 0px)` }}
                animate={reduced ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0% round 0px)' }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={reduced ? { duration: 0.15 } : { duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              >
                <motion.div
                  className="block__panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.22, duration: 0.25 } }}
                >
                  {tool(selected)}
                </motion.div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ToolHostContext.Provider>
  )
}
