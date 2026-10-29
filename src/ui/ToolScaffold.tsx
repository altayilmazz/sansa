import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { navigate } from '../state/router'
import { TOOLS, type ToolId } from '../state/tools'
import { ToolGlyph } from '../objects/ToolGlyph'
import { IconButton } from './controls'
import { Icon } from './Icon'
import { ExampleChips } from './ToolHost'

interface Props {
  tool: ToolId
  stage: ReactNode
  controls: ReactNode
  /** Alt çubuktaki ana eylem ve yardımcı eylemler. */
  action: ReactNode
  rules: string[]
  /** Ekran okuyucular için sonuç metni; sonuç kesinleştiğinde dolar. */
  live: string
  banner?: ReactNode
}

export function ToolScaffold({ tool, stage, controls, action, rules, live, banner }: Props) {
  const meta = TOOLS[tool]
  const title = useRef<HTMLHeadingElement>(null)

  // Pencere açılınca başlığa odaklan: klavye ve ekran okuyucu yeni içeriği bulur.
  useEffect(() => {
    title.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="tool" style={{ '--tint': meta.tint } as CSSProperties}>
      <header className="tool__head">
        <div className="tool__title-wrap">
          <span className="tool__glyph" aria-hidden="true">
            <ToolGlyph tool={tool} size={30} />
          </span>
          <h1 className="tool__title" tabIndex={-1} ref={title}>
            {meta.name}
          </h1>
        </div>
        <ExampleChips tool={tool} />
        <IconButton className="tool__close" icon="close" label={`${meta.name} penceresini kapat`} onClick={() => navigate({ name: 'home' })} />
      </header>

      <section className="tool__stage" aria-label="Sahne">
        {stage}
      </section>

      <div className="tool__panel">
        {banner}
        <details className="rules" open>
          <summary className="rules__summary">
            <Icon name="info" size={16} />
            <span>Kurallar</span>
            <Icon name="chevronRight" size={16} className="rules__chev" />
          </summary>
          <ul className="rules__list">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
        {controls}
      </div>

      <div className="actionbar">
        <div className="actionbar__inner">{action}</div>
      </div>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {live}
      </p>
    </div>
  )
}
