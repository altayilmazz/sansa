import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { navigate } from '../state/router'
import { TOOLS, type ToolId } from '../state/tools'
import { ToolGlyph } from '../objects/ToolGlyph'
import { IconButton } from './controls'
import { DeleteZone, DragDeleteProvider } from './dragDelete'
import { Sheet } from './Sheet'
import { ExampleChips } from './ToolHost'

interface Props {
  tool: ToolId
  stage: ReactNode
  /** Sahnenin altında, aşağı kaydırınca görünen ayarlar (çoğu araçta yoktur). */
  controls?: ReactNode
  /** Alt çubuktaki ana eylem ve yardımcı eylemler. */
  action: ReactNode
  rules: string[]
  /** Ekran okuyucular için sonuç metni; sonuç kesinleştiğinde dolar. */
  live: string
  /** Sahnenin üstündeki ince şerit (ör. örnek veri uyarısı). */
  banner?: ReactNode
  /** Alt çubukta, ana düğmenin üstünde duran tek satırlık ekleme çubuğu. */
  adder?: ReactNode
  /** Bilgi penceresine eklenen bölümler (ör. liste işlemleri). */
  extra?: (close: () => void) => ReactNode
  /** Araca ait ek pencereler (ör. kayıtlı listeler). */
  overlays?: ReactNode
}

export function ToolScaffold({ tool, stage, controls, action, rules, live, banner, adder, extra, overlays }: Props) {
  const meta = TOOLS[tool]
  const title = useRef<HTMLHeadingElement>(null)
  const [info, setInfo] = useState(false)

  // Pencere açılınca başlığa odaklan: klavye ve ekran okuyucu yeni içeriği bulur.
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
  }, [])

  return (
    <DragDeleteProvider>
      <div className={`tool${controls ? ' has-panel' : ''}`} style={{ '--tint': meta.tint } as CSSProperties}>
        {/* Dar ekranda başlık görünmez (seçili sekme zaten gösterir) ama ekran okuyucu için durur. */}
        <header className="tool__head">
          <div className="tool__title-wrap">
            <span className="tool__glyph" aria-hidden="true">
              <ToolGlyph tool={tool} size={30} />
            </span>
            <h1 className="tool__title" tabIndex={-1} ref={title}>
              {meta.name}
            </h1>
          </div>
          <IconButton className="tool__close" icon="close" label={`${meta.name} penceresini kapat`} onClick={() => navigate({ name: 'home' })} />
        </header>

        <div className="tool__scroll">
          <section className="tool__stage" aria-label="Sahne">
            {banner}
            {stage}
          </section>
          {controls && <div className="tool__panel">{controls}</div>}
        </div>

        <div className="actionbar">
          <div className="actionbar__inner">
            {adder && <div className="actionbar__adder">{adder}</div>}
            <IconButton className="actionbar__info" icon="info" label="Kurallar ve örnekler" onClick={() => setInfo(true)} />
            {action}
            <DeleteZone />
          </div>
        </div>

        <Sheet open={info} onClose={() => setInfo(false)} title={meta.name}>
          <section className="info" aria-labelledby={`info-rules-${tool}`}>
            <h3 className="info__title" id={`info-rules-${tool}`}>
              Kurallar
            </h3>
            <ul className="info__rules">
              {rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
          <ExampleChips tool={tool} />
          {extra?.(() => setInfo(false))}
        </Sheet>
        {overlays}

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {live}
        </p>
      </div>
    </DragDeleteProvider>
  )
}
