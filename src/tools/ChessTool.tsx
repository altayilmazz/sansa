import { useState } from 'react'
import { uid } from '../lib/random'
import { playRandomGame, START, type Color, type Game } from '../lib/rules/chess'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button } from '../ui/controls'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

/** Dolu (siyah) taş glifleri; metin gösterimi zorlanır, renk CSS ile verilir. */
const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
const TEXT = '︎'
const PLAY_MS = 3000
const isSide = (v: unknown): v is Color => v === 'w' || v === 'b'
const NAME: Record<Color, string> = { w: 'Beyaz', b: 'Siyah' }
const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/** Mat ile biten ilk oyunu bulur; beraberlikle biten oyunlar atılır. */
async function decisiveGame(): Promise<Game> {
  for (let i = 0; i < 400; i++) {
    const g = playRandomGame()
    if (g.result !== 'draw') return g
    if (i % 6 === 5) await tick()
  }
  throw new Error('Sonuçlanan oyun bulunamadı')
}

export function ChessTool() {
  const [side, setSide] = usePersistent<Color>('satranc:taraf', 'w', isSide)
  const [game, setGame] = useState<Game | null>(null)
  const [ply, setPly] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'prep' | 'play' | 'done'>('idle')
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const start = () =>
    run(async () => {
      setLive('')
      setPhase('prep')
      setGame(null)
      setPly(0)
      sfx.whoosh()
      haptic(10)
      // Oyun, görüntülenmeden önce baştan sona oynanır; ekran yalnızca onu hızlı sarar.
      const g = await decisiveGame()
      if (!mounted.current) return
      setGame(g)
      setPhase('play')
      const total = g.moves.length
      await new Promise<void>((resolve) => {
        const t0 = performance.now()
        const dur = reduced ? 150 : PLAY_MS
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / dur)
          setPly(Math.floor(p * total))
          if (p < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
      if (!mounted.current) return
      setPly(total)
      setPhase('done')
      sfx.win()
      haptic(30)
      const w = g.result as Color
      setLive(`${NAME[w]} kazandı. ${total} hamlede mat.`)
      record(uid(), { tool: 'satranc', title: `${NAME[w]} kazandı`, detail: `Hızlı satranç · ${total} hamlede mat` })
    })

  const board = game ? game.boards[ply] : null
  const last = game && ply > 0 ? game.moves[ply - 1] : null
  const initial = board ?? START
  // Seçilen renk ekranın altında durur.
  const flip = side === 'b'
  const squares = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i))
  const winner = phase === 'done' && game ? (game.result as Color) : null

  const stage = (
    <>
      <div className="stage-body chess-stage">
        <p className={`chess__status${winner ? ' is-over' : ''}`} aria-hidden="true">
          {winner ? `${NAME[winner]} kazandı!` : phase === 'prep' ? 'Hazırlanıyor…' : phase === 'play' ? 'Oynanıyor…' : 'Bir renk seç ve oyunu başlat'}
        </p>
        <div className="chess-wrap">
        <div className="chess" role="img" aria-label="Satranç tahtası">
          {squares.map((sq) => {
            const r = Math.floor(sq / 8)
            const c = sq % 8
            const p = initial[sq]
            const dark = (r + c) % 2 === 1
            const hot = last && (last.from === sq || last.to === sq)
            return (
              <span key={sq} className={`sq${dark ? ' is-dark' : ''}${hot ? ' is-hot' : ''}`}>
                {p && (
                  <span className={`pc ${p === p.toUpperCase() ? 'is-w' : 'is-b'}`}>
                    {GLYPH[p.toUpperCase()]}
                    {TEXT}
                  </span>
                )}
              </span>
            )
          })}
        </div>
        {winner && game && game.moves.length > 0 && (
          <div key={`win-${game.moves.length}-${winner}`} className={`chess__win is-${winner}`} aria-hidden="true">
            <span className={`pc ${winner === 'w' ? 'is-w' : 'is-b'}`}>
              {GLYPH[game.boards[game.moves.length][game.moves[game.moves.length - 1].to].toUpperCase()]}
              {TEXT}
            </span>
          </div>
        )}
        </div>
        <p className="stage-hint" aria-hidden="true">
          {phase === 'play' ? `${ply} / ${game?.moves.length} hamle` : phase === 'done' ? `${game?.moves.length} hamlede mat` : ' '}
        </p>
      </div>
      <StageBar
        left={
          <>
            <RoundButton label="Beyaz" on={side === 'w'} disabled={busy} onClick={() => setSide('w')}>
              <span className="pc is-w pc--btn">♚{TEXT}</span>
            </RoundButton>
            <RoundButton label="Siyah" on={side === 'b'} disabled={busy} onClick={() => setSide('b')}>
              <span className="pc is-b pc--btn">♚{TEXT}</span>
            </RoundButton>
          </>
        }
      />
    </>
  )

  return (
    <ToolScaffold
      tool="satranc"
      stage={stage}
      action={
        <Button variant="primary" size="lg" block onClick={start} disabled={busy}>
          {phase === 'prep' ? 'Hazırlanıyor…' : phase === 'play' ? 'Oynanıyor…' : phase === 'done' ? 'Yeni oyun' : 'Oyunu başlat'}
        </Button>
      }
      onReset={() => {
        setGame(null)
        setPly(0)
        setPhase('idle')
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || phase === 'idle'}
      live={live}
      settings={
        <>
          <div className="row">
            <div className="row__text">
              <span className="row__label">Renk</span>
              <span className="row__hint">Sol alttaki iki düğmenin işi. Seçtiğin renk tahtanın altında durur.</span>
            </div>
            <div className="row__control">
              <Button variant="secondary" onClick={() => setSide(side === 'w' ? 'b' : 'w')} disabled={busy}>
                {NAME[side]}
              </Button>
            </div>
          </div>
        </>
      }
      rules={[
        'İki taraf da rastgele oynar: her sırada yapılabilecek yasal hamlelerden biri eşit olasılıkla seçilir.',
        'Taşlar gerçek satranç kurallarına göre hareket eder; şah tehdidi, mat ve pat uygulanır. Rok ve en passant yoktur, piyon son sırada vezire terfi eder.',
        'Oyun baştan sona önceden oynanır; ekran yaklaşık 3 saniyede hızlıca sarar ve mat eden rengi gösterir.',
        'Beraberlikle biten (pat, yetersiz malzeme, hamle sınırı) oyunlar atılır; mat ile biten ilk oyun gösterilir. İki renk de mat edebilir; sonuç tamamen oyunun gidişine bağlıdır.',
      ]}
    />
  )
}
