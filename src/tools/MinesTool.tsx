import { useState, type CSSProperties } from 'react'
import { uid } from '../lib/random'
import { clampMines, clampSize, maxMines, MAX_SIZE, MIN_SIZE, newGame, reveal, safeLeft, type Game } from '../lib/rules/mines'
import { haptic, sfx } from '../features/sound'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Segmented, Stepper } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'
const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i)

function MineIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <circle cx="16" cy="17" r="8" />
        {[0, 45, 90, 135].map((a) => (
          <rect key={a} x="14.6" y="4" width="2.8" height="26" rx="1.4" transform={`rotate(${a} 16 17)`} />
        ))}
      </g>
    </svg>
  )
}

export function MinesTool() {
  const [sizeP, setSizeP] = usePersistent('mayin:boyut', 4, isNum)
  const [minesP, setMinesP] = usePersistent('mayin:sayi', 3, isNum)
  const size = clampSize(sizeP)
  const mines = clampMines(size, minesP)
  const [game, setGame] = useState<Game>(() => newGame(size, mines))
  const [live, setLive] = useState('')
  const { record } = useStore()

  const restart = (s = size, m = mines) => {
    setGame(newGame(s, m))
    setLive('Yeni oyun başladı.')
  }

  const tap = (i: number) => {
    const g = game
    if (g.state !== 'play' || g.cells[i].open) return
    const next = reveal(g, i)
    setGame(next)
    if (next.state === 'play') {
      sfx.tap()
      haptic(8)
      return
    }
    const opened = g.cells.filter((c) => c.open).length
    if (next.state === 'boom') {
      sfx.tick()
      haptic(45)
      setLive('Mayın patladı. Oyun bitti.')
      record(uid(), { tool: 'mayin', title: 'Mayın patladı', detail: `${size}×${size}, ${mines} mayın · ${opened} güvenli kare açıldı` })
    } else {
      sfx.win()
      haptic(30)
      setLive('Tüm güvenli kareler açıldı; mayın patlamadı.')
      record(uid(), { tool: 'mayin', title: 'Mayın patlamadı', detail: `${size}×${size}, ${mines} mayın · tüm güvenli kareler açıldı` })
    }
  }

  const changeSize = (s: number) => {
    const sz = clampSize(s)
    const m = clampMines(sz, mines)
    setSizeP(sz)
    setMinesP(m)
    restart(sz, m)
  }
  const changeMines = (n: number) => {
    const m = clampMines(size, n)
    setMinesP(m)
    restart(size, m)
  }

  const over = game.state !== 'play'
  const left = safeLeft(game)
  const status = game.state === 'boom' ? 'Mayın patladı!' : game.state === 'clear' ? 'Hiç mayın patlamadı' : `${mines} mayın · ${left} güvenli kare`

  const stage = (
    <>
      <div className="stage-body mines-stage">
        <p className={`mines__status${over ? ' is-over' : ''}${game.state === 'boom' ? ' is-boom' : ''}`} aria-hidden="true">
          {status}
        </p>
        <div className="mines" role="grid" aria-label="Mayın tarlası" style={{ '--cols': game.size, '--rows': game.size } as CSSProperties}>
          {game.cells.map((c, i) => (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={`mcell${c.open ? ' is-open' : ''}${c.open && c.mine ? ' is-mine' : ''}${game.boom === i ? ' is-boom' : ''}`}
              aria-label={`${Math.floor(i / game.size) + 1}. satır, ${(i % game.size) + 1}. sütun: ${c.open ? (c.mine ? 'mayın' : 'güvenli') : 'kapalı'}`}
              disabled={over || c.open}
              onClick={() => tap(i)}
            >
              {c.open ? c.mine ? <MineIcon size={28} /> : <Icon name="check" size={24} /> : null}
            </button>
          ))}
        </div>
        <p className="stage-hint" aria-hidden="true">
          {over ? 'Yeni oyun için alttaki düğmeye bas' : 'Bir kareye dokun'}
        </p>
      </div>
      <StageBar
        left={
          <RoundButton
            pill
            label={`Tarla boyutu: ${size}×${size}. Değiştirmek için dokun.`}
            onClick={() => changeSize(size >= MAX_SIZE ? MIN_SIZE : size + 1)}
          >
            {size}×{size}
          </RoundButton>
        }
        right={<Stepper value={mines} min={1} max={maxMines(size)} onChange={changeMines} label="Mayın sayısı" format={(n) => `${n} mayın`} />}
      />
    </>
  )

  const action = (
    <Button variant="primary" size="lg" block icon={over ? 'refresh' : undefined} onClick={() => restart()}>
      {over ? 'Yeni oyun' : 'Baştan başla'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="mayin"
      stage={stage}
      action={action}
      onReset={() => restart()}
      live={live}
      settings={
        <>
          <Row label="Tarla boyutu" hint="Sol alttaki boyut düğmesinin işi. Değişince oyun yeniden başlar.">
            <Segmented label="Tarla boyutu" value={String(size)} options={SIZES.map((s) => ({ value: String(s), label: `${s}×${s}` }))} onChange={(v) => changeSize(Number(v))} />
          </Row>
          <Row label="Mayın sayısı" hint="Sağ alttaki − ve + düğmelerinin işi. En fazla bir kare güvenli kalır.">
            <Stepper value={mines} min={1} max={maxMines(size)} onChange={changeMines} label="Mayın sayısı" format={(n) => `${n} mayın`} />
          </Row>
        </>
      }
      rules={[
        'Tarla 2×2’den 6×6’ya kadar kare bir ızgaradır; kaç mayın olacağını sen seçersin.',
        'Mayınlar oyun başında rastgele yerleştirilir ve hangi karede olduğu hiçbir ipucuyla anlaşılamaz.',
        'Mayına basılırsa tüm mayınlar görünür ve oyun biter. Tüm güvenli kareler açılırsa mayın patlamamış olur.',
      ]}
    />
  )
}
