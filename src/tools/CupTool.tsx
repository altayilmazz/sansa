import { motion } from 'motion/react'
import { useState } from 'react'
import { uid } from '../lib/random'
import { liftCup, MAX_CUPS, MIN_CUPS, newCups, type Cups } from '../lib/rules/party'
import { haptic, sfx } from '../features/sound'
import { useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Stepper } from '../ui/controls'
import { StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'

export function CupTool() {
  const [count, setCount] = usePersistent('kutu:sayi', 4, isNum)
  const [game, setGame] = useState<Cups>(() => newCups(count))
  const [live, setLive] = useState('')
  const reduced = useReducedMotion()
  const { record } = useStore()

  const fresh = (n = count) => {
    setGame(newCups(n))
    setLive('Bardaklar karıştırıldı.')
    sfx.whoosh()
    haptic(10)
  }

  const lift = (id: number) => {
    // Altındakiler oyun başında belirlidir; kaldırınca yalnızca görünür olur.
    const next = liftCup(game, id)
    if (next === game) return
    setGame(next)
    haptic(10)
    if (next.state === 'over') {
      sfx.win()
      haptic(40)
      setLive(`${next.lifted.length}. bardak: altından kaybeden işareti çıktı.`)
      record(uid(), { tool: 'kutu', title: 'Bardak altı: işaret çıktı', detail: `${next.order.length} bardak · ${next.lifted.length}. bardakta` })
    } else {
      sfx.tap()
      setLive('Altı boş.')
    }
  }

  const over = game.state === 'over'

  const stage = (
    <>
      <div className="stage-body cup-stage">
        <div className="cups" role="group" aria-label="Bardaklar">
          {game.order.map((c) => {
            const up = game.lifted.includes(c.id) || (over && c.bad)
            return (
              <motion.button
                key={c.id}
                layout={!reduced}
                transition={{ layout: { type: 'spring', stiffness: 260, damping: 26 } }}
                type="button"
                className="cupbtn"
                aria-label={up ? (c.bad ? 'Bardak, altında işaret var' : 'Bardak, altı boş') : 'Bardağı kaldır'}
                disabled={up || over}
                onClick={() => lift(c.id)}
              >
                <span className={`cupbtn__under${up && c.bad ? ' is-bad' : ''}`} aria-hidden="true" />
                <motion.span className={`cupbtn__cup${up && c.bad ? ' is-bad' : ''}`} initial={false} animate={{ y: up ? -56 : 0, rotate: up ? -5 : 0 }} transition={reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 240, damping: 18 }} />
              </motion.button>
            )
          })}
        </div>
        <p className="stage-hint" aria-hidden="true">
          {over ? 'İşaret çıktı! Yeniden karıştırmak için alttaki düğmeye bas' : `${game.lifted.length} / ${game.order.length} bardak açıldı · sırayla birer bardak kaldır`}
        </p>
      </div>
      <StageBar
        center={
          <Stepper
            value={count}
            min={MIN_CUPS}
            max={MAX_CUPS}
            onChange={(n) => {
              setCount(n)
              fresh(n)
            }}
            label="Bardak sayısı"
            format={(n) => `${n} bardak`}
          />
        }
      />
    </>
  )

  return (
    <ToolScaffold
      tool="kutu"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block icon="refresh" onClick={() => fresh()}>
          {over ? 'Yeniden karıştır' : 'Bardakları karıştır'}
        </Button>
      }
      onReset={() => fresh()}
      live={live}
      settings={
        <Row label="Bardak sayısı" hint="Sahnedeki − ve + düğmelerinin işi. Değişince bardaklar yeniden karışır.">
          <Stepper value={count} min={MIN_CUPS} max={MAX_CUPS} onChange={(n) => (setCount(n), fresh(n))} label="Bardak sayısı" format={(n) => `${n} bardak`} />
        </Row>
      }
      rules={[
        'Bardaklardan yalnızca birinin altında işaret vardır; hangisi olduğu oyun başında rastgele (Web Crypto) belirlenir ve bardaklar rastgele sıraya dizilir.',
        'Herkes sırayla bir bardak kaldırır. Altı boşsa oyun sürer.',
        'İşareti kaldıran kaybeder; oyun orada biter.',
      ]}
    />
  )
}
