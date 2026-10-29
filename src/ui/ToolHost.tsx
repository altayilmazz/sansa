import { createContext, useContext } from 'react'
import { EXAMPLES, type Example } from '../state/examples'
import type { ToolId } from '../state/tools'

/** Açılan araç penceresinin ev sahibi; araçlar örnek yüklemek için bunu kullanır. */
export interface ToolHostValue {
  loadExample: (e: Example) => void
}

export const ToolHostContext = createContext<ToolHostValue | null>(null)

export function ExampleChips({ tool }: { tool: ToolId }) {
  const host = useContext(ToolHostContext)
  const list = EXAMPLES.filter((e) => e.tool === tool)
  if (!host || list.length === 0) return null
  return (
    <div className="example-chips">
      <span className="example-chips__label">Örnek dene</span>
      {list.map((e) => (
        <button key={e.id} type="button" className="chip-btn" onClick={() => host.loadExample(e)}>
          {e.title}
        </button>
      ))}
    </div>
  )
}
