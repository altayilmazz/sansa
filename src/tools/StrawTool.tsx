import { motion } from 'motion/react'
import { useState } from 'react'
import { uid } from '../lib/random'
import { MAX_STRAWS, MIN_STRAWS, newStraws, pullStraw, type Straws } from '../lib/rules/party'
import { haptic, sfx } from '../features/sound'
import { useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Stepper } from '../ui/controls'
import { StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'
/** Çizim ölçüleri (px): çöpler yumruğun içinden çıkar; yalnızca üst kısmı görünür. */
const LONG = 150
const SHORT = 72
const VISIBLE = 64

export function StrawTool() {
  const [count, setCount] = usePersistent('cop:sayi', 4, isNum)
  const [game, setGame] = useState<Straws>(() => newStraws(count))
  const [live, setLive] = useState('')
  const reduced = useReducedMotion()
  const { record } = useStore()

  const fresh = (n = count) => {
    setGame(newStraws(n))
    setLive('Çöpler karıştırıldı.')
    sfx.whoosh()
    haptic(10)
  }

  const pull = (i: number) => {
    // Sonuç çekilmeden önce belirlidir; çizim yalnızca gösterir.
    const next = pullStraw(game, i)
    if (next === game) return
    setGame(next)
    haptic(10)
    if (next.state === 'short') {
      sfx.win()
      haptic(40)
      setLive(`${next.pulled.length}. çekiliş: kısa çöp çıktı.`)
      record(uid(), { tool: 'cop', title: 'Kısa çöp çıktı', detail: `${next.n} çöp · ${next.pulled.length}. çekilişte` })
    } else {
      sfx.tap()
      setLive(`${i + 1}. çöp uzun çıktı.`)
    }
  }

  const over = game.state === 'short'

  const stage = (
    <>
      <div className="stage-body straw-stage">
        <div className="straws" role="group" aria-label="Çöpler">
          {Array.from({ length: game.n }, (_, i) => {
            const pulled = game.pulled.includes(i)
            const isShort = i === game.short
            return (
              <button key={i} type="button" className="straw" aria-label={pulled ? `${i + 1}. çöp, ${isShort ? 'kısa' : 'uzun'}` : `${i + 1}. çöpü çek`} disabled={pulled || over} onClick={() => pull(i)}>
                <motion.span
                  className={`straw__bar${pulled ? (isShort ? ' is-short' : ' is-long') : ''}`}
                  initial={false}
                  animate={{ height: pulled ? (isShort ? SHORT : LONG) : VISIBLE + 26, y: pulled ? -(VISIBLE - 10) : 0 }}
                  transition={reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 220, damping: 20 }}
                />
              </button>
            )
          })}
          <span className="straws__fist" aria-hidden="true" />
        </div>
        <p className="stage-hint" aria-hidden="true">
          {over ? 'Kısa çöp çıktı! Yeniden karıştırmak için alttaki düğmeye bas' : `${game.pulled.length} / ${game.n} çöp çekildi · sırayla birer çöp çek`}
        </p>
      </div>
      <StageBar
        center={
          <Stepper
            value={count}
            min={MIN_STRAWS}
            max={MAX_STRAWS}
            onChange={(n) => {
              setCount(n)
              fresh(n)
            }}
            label="Çöp sayısı"
            format={(n) => `${n} çöp`}
          />
        }
      />
    </>
  )

  return (
    <ToolScaffold
      tool="cop"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block icon="refresh" onClick={() => fresh()}>
          {over ? 'Yeniden karıştır' : 'Çöpleri karıştır'}
        </Button>
      }
      onReset={() => fresh()}
      live={live}
      settings={
        <Row label="Çöp sayısı" hint="Oynayan kişi sayısı kadar çöp seç. Sahnedeki − ve + düğmelerinin işi.">
          <Stepper value={count} min={MIN_STRAWS} max={MAX_STRAWS} onChange={(n) => (setCount(n), fresh(n))} label="Çöp sayısı" format={(n) => `${n} çöp`} />
        </Row>
      }
      rules={[
        'Çöp sayısı oynayan kişi kadardır; çöplerden yalnızca biri kısadır ve hangisi olduğu oyun başında rastgele (Web Crypto) belirlenir.',
        'Herkes sırayla bir çöp seçer. Çöpün boyu çekilince görünür.',
        'Kısa çöpü çeken kaybeder; oyun orada biter. Yeniden karıştırınca kısa çöp başka bir yere gelir.',
      ]}
    />
  )
}
