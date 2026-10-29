import { useRef, useState, type CSSProperties } from 'react'
import { uid } from '../lib/random'
import { flagsLeft, LEVELS, newGame, reveal, toggleFlag, type Game, type MineLevel } from '../lib/rules/mines'
import { haptic, sfx } from '../features/sound'
import { usePersistent, useStore } from '../state/store'
import { Button, Row, Segmented } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isLevel = (v: unknown): v is MineLevel['id'] => v === 'kolay' || v === 'orta' || v === 'zor'
const levelOf = (id: MineLevel['id']) => LEVELS.find((l) => l.id === id) ?? LEVELS[0]
const LONG_PRESS = 380

export function MinesTool() {
  const [levelId, setLevelId] = usePersistent<MineLevel['id']>('mayin:seviye', 'kolay', isLevel)
  const level = levelOf(levelId)
  const [game, setGame] = useState<Game>(() => newGame(level))
  const [flagMode, setFlagMode] = useState(false)
  const [live, setLive] = useState('')
  const press = useRef<{ timer: number; long: boolean } | null>(null)
  const { record } = useStore()

  const restart = (l: MineLevel = level) => {
    setGame(newGame(l))
    setLive('Yeni oyun başladı.')
  }

  const finish = (g: Game, prev: Game) => {
    if (g.state === prev.state || g.state === 'play') return
    const won = g.state === 'won'
    if (won) {
      sfx.win()
      haptic(30)
    } else {
      sfx.tick()
      haptic(40)
    }
    setLive(won ? 'Tarlayı temizledin, kazandın.' : 'Mayına bastın, kaybettin.')
    record(uid(), { tool: 'mayin', title: won ? 'Mayın tarlası: kazandın' : 'Mayın tarlası: kaybettin', detail: `${level.name} · ${level.cols}×${level.rows}, ${level.mines} mayın` })
  }

  const apply = (next: (g: Game) => Game) => {
    setGame((g) => {
      const n = next(g)
      if (n !== g) finish(n, g)
      return n
    })
  }

  const dig = (i: number) => apply((g) => reveal(g, i))
  const flag = (i: number) => {
    sfx.tap()
    haptic(10)
    apply((g) => toggleFlag(g, i))
  }

  // Kısa dokunuş: aç (ya da bayrak modunda bayrak); basılı tutma: bayrak.
  const down = (i: number) => {
    const p = { long: false, timer: 0 }
    p.timer = window.setTimeout(() => {
      p.long = true
      flag(i)
    }, LONG_PRESS)
    press.current = p
  }
  const up = (i: number) => {
    const p = press.current
    if (!p) return
    window.clearTimeout(p.timer)
    press.current = null
    if (p.long) return
    if (flagMode) flag(i)
    else {
      sfx.tap()
      dig(i)
    }
  }
  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }

  const over = game.state !== 'play'
  const status = game.state === 'won' ? 'Kazandın!' : game.state === 'lost' ? 'Mayına bastın' : `${flagsLeft(game)} bayrak kaldı`

  const stage = (
    <>
      <div className="stage-body mines-stage">
        <p className={`mines__status${over ? ' is-over' : ''}`} aria-hidden="true">
          {status}
        </p>
        <div
          className="mines"
          role="grid"
          aria-label="Mayın tarlası"
          style={{ '--cols': game.cols, '--rows': game.rows } as CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
        >
          {game.cells.map((c, i) => {
            const cls = ['mcell']
            if (c.open) cls.push('is-open')
            if (c.open && c.mine) cls.push('is-mine')
            if (game.boom === i) cls.push('is-boom')
            const label = c.open ? (c.mine ? 'Mayın' : c.n ? `${c.n} mayın çevrede` : 'Boş') : c.flag ? 'Bayraklı' : 'Kapalı'
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={cls.join(' ')}
                aria-label={`${Math.floor(i / game.cols) + 1}. satır, ${(i % game.cols) + 1}. sütun: ${label}`}
                disabled={over}
                data-n={c.open && !c.mine && c.n ? c.n : undefined}
                onPointerDown={() => down(i)}
                onPointerUp={() => up(i)}
                onPointerLeave={cancel}
                onPointerCancel={cancel}
                onKeyDown={(e) => {
                  if (e.key === 'f' || e.key === 'F') flag(i)
                }}
                onClick={(e) => {
                  // Klavye (Enter/Boşluk) tıklaması: işaretçi olayları yoksa burada işlenir.
                  if (e.detail === 0) {
                    if (flagMode) flag(i)
                    else dig(i)
                  }
                }}
              >
                {c.open ? (c.mine ? <Icon name="close" size={14} /> : c.n || '') : c.flag ? <Icon name="flag" size={14} /> : ''}
              </button>
            )
          })}
        </div>
        <p className="stage-hint" aria-hidden="true">
          {over ? 'Yeni oyun için alttaki düğmeye bas' : 'Dokun: aç · Basılı tut: bayrak'}
        </p>
      </div>
      <StageBar
        left={<RoundButton icon="flag" label={flagMode ? 'Bayrak modu: açık' : 'Bayrak modu: kapalı'} on={flagMode} disabled={over} onClick={() => setFlagMode((v) => !v)} />}
        right={
          <RoundButton
            label={`Seviye: ${level.name}. Değiştirmek için dokun.`}
            disabled={false}
            onClick={() => {
              const next = LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length]
              setLevelId(next.id)
              restart(next)
            }}
          >
            {level.name[0]}
          </RoundButton>
        }
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
          <Row label="Seviye" hint="Sağ alttaki harf düğmesinin işi. Değişince oyun yeniden başlar.">
            <Segmented
              label="Seviye"
              value={levelId}
              options={LEVELS.map((l) => ({ value: l.id, label: l.name }))}
              onChange={(v) => {
                setLevelId(v)
                restart(levelOf(v))
              }}
            />
          </Row>
          <Row label="Bayrak modu" hint="Sol alttaki bayrak düğmesinin işi: açıkken dokunmak bayrak koyar.">
            <Button variant="secondary" icon="flag" onClick={() => setFlagMode((v) => !v)}>
              {flagMode ? 'Kapat' : 'Aç'}
            </Button>
          </Row>
        </>
      }
      rules={[
        'Amaç, mayın olmayan tüm kareleri açmaktır; mayına basarsan oyun biter.',
        'Sayı, o karenin çevresindeki (çapraz dahil) mayın sayısını gösterir.',
        'İlk dokunuş ve çevresi hiçbir zaman mayın olmaz; mayınlar ilk dokunuştan sonra rastgele yerleştirilir.',
        'Bir kareyi açmak için dokun; bayrak koymak için basılı tut ya da sol alttaki bayrak düğmesini aç.',
        'Sağ alttaki harf düğmesi seviyeyi değiştirir: Kolay 8×8 / 10 mayın, Orta 8×10 / 16, Zor 8×12 / 26.',
      ]}
    />
  )
}
