import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { uid } from '../lib/random'
import { ask, type EightKind } from '../lib/rules/party'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { useStore } from '../state/store'
import { Button } from '../ui/controls'
import { ToolScaffold } from '../ui/ToolScaffold'

export function EightTool() {
  const [answer, setAnswer] = useState<{ text: string; kind: EightKind } | null>(null)
  const [live, setLive] = useState('')
  const [shake, setShake] = useState(0)
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const rollIt = () =>
    run(async () => {
      // Cevap sallamadan önce belirlenir; animasyon yalnızca gösterir.
      const a = ask()
      setAnswer(null)
      setShake((s) => s + 1)
      sfx.dice()
      haptic(20)
      await wait(reduced ? 150 : 900)
      if (!mounted.current) return
      setAnswer(a)
      sfx.reveal()
      haptic(12)
      setLive(a.text)
      record(uid(), { tool: 'top8', title: 'Sihirli 8 top', detail: a.text })
    })

  const stage = (
    <div className="stage-body eight-stage">
      <motion.div
        key={shake}
        className="eight"
        animate={shake > 0 && !reduced ? { rotate: [0, -12, 10, -8, 6, 0], x: [0, -10, 9, -6, 4, 0], y: [0, 6, -6, 4, 0, 0] } : {}}
        transition={{ duration: 0.85 }}
        aria-hidden="true"
      >
        <span className="eight__num">8</span>
        <span className="eight__win">
          <AnimatePresence mode="wait">
            {answer && (
              <motion.span key={answer.text + shake} className={`eight__ans is-${answer.kind}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {answer.text}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.div>
      <p className="stage-hint" aria-hidden="true">
        {answer ? 'Bir soru düşün, yeniden salla' : 'Evet ya da hayır diye bir soru düşün ve salla'}
      </p>
    </div>
  )

  return (
    <ToolScaffold
      tool="top8"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block onClick={rollIt} disabled={busy}>
          {busy ? '…' : 'Salla'}
        </Button>
      }
      onReset={() => {
        setAnswer(null)
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || !answer}
      live={live}
      rules={[
        'Evet ya da hayır cevabı olan bir soru düşün ve topu salla.',
        'Yedi olumlu, beş kararsız ve beş olumsuz cevap vardır; her cevap eşit olasılıkla, Web Crypto ile seçilir.',
        'Cevap sallamadan önce belirlenir; sorunun içeriğiyle bir ilgisi yoktur. Eğlence içindir, karar vermek için kullanma.',
      ]}
    />
  )
}
