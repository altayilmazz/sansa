import { useState } from 'react'
import { takePendingExample, type Example } from '../state/examples'
import type { ToolId } from '../state/tools'
import { Button } from './controls'

/**
 * Araç açılırken bekleyen bir örnek varsa bir kez uygular ve "örnek veri"
 * olduğunu açıkça gösteren, geri alınabilir bir şerit döndürür.
 */
export function useExample(tool: ToolId, apply: (e: Example) => () => void) {
  const [state, setState] = useState<{ example: Example; undo: () => void } | null>(() => {
    const e = takePendingExample(tool)
    return e ? { example: e, undo: apply(e) } : null
  })
  const banner = state ? (
    <div className="example-banner" role="note">
      <div>
        <strong>Örnek: {state.example.title}</strong>
        <span>Bu liste denemen için hazırlandı; istediğin gibi değiştir.</span>
      </div>
      <Button
        variant="plain"
        icon="undo"
        onClick={() => {
          state.undo()
          setState(null)
        }}
      >
        Geri al
      </Button>
    </div>
  ) : null
  return banner
}
