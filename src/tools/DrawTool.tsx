import { motion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { makeEntries, type Entry } from '../lib/entries'
import { uid } from '../lib/random'
import { checkDraw, drawWinners } from '../lib/rules/draw'
import { isEntryList } from '../lib/storage'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { Button, Group, Notice, Row, Stepper } from '../ui/controls'
import { EntryChips } from '../ui/EntryChips'
import { useEntryEditor } from '../ui/EntryEditor'
import { useExample } from '../ui/ExampleBanner'
import { Icon } from '../ui/Icon'
import { RoundButton, StageBar } from '../ui/StageButtons'
import { ToolScaffold } from '../ui/ToolScaffold'

const isNum = (v: unknown): v is number => typeof v === 'number'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

export function DrawTool() {
  const [entries, setEntries] = usePersistent<Entry[]>('kura:list', [], isEntryList)
  const [count, setCount] = usePersistent('kura:count', 1, isNum)
  // Çekilen kayıt sonraki turlardan çıkar (varsayılan açık). Anahtar yenilendi: eski kayıtlı seçim ezmesin.
  const [removeDrawn, setRemoveDrawn] = usePersistent('kura:remove2', true, isBool)
  const [drawnIds, setDrawnIds] = usePersistent<string[]>('kura:drawn', [], isIds)
  const [winners, setWinners] = useState<Entry[] | null>(null)
  const [phase, setPhase] = useState<'idle' | 'mix' | 'reveal' | 'done'>('idle')
  const [round, setRound] = useState(0)
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const banner = useExample('kura', (e) => {
    const prev = { entries, count, drawnIds }
    setEntries(makeEntries(e.names ?? []))
    setDrawnIds([])
    if (e.winners) setCount(e.winners)
    return () => {
      setEntries(prev.entries)
      setCount(prev.count)
      setDrawnIds(prev.drawnIds)
    }
  })

  // Silinen kayıtlar çekilmiş listesinden de düşer.
  useEffect(() => {
    const ids = new Set(entries.map((e) => e.id))
    if (drawnIds.some((id) => !ids.has(id))) setDrawnIds(drawnIds.filter((id) => ids.has(id)))
  }, [entries, drawnIds, setDrawnIds])

  const pool = useMemo(() => {
    if (!removeDrawn) return entries
    const out = new Set(drawnIds)
    return entries.filter((e) => !out.has(e.id))
  }, [entries, drawnIds, removeDrawn])

  const struck = useMemo(() => new Set(removeDrawn ? drawnIds : []), [removeDrawn, drawnIds])
  const check = checkDraw(pool.length, count)
  const maxCount = Math.max(1, pool.length)
  const exhausted = removeDrawn && entries.length > 0 && pool.length === 0

  const editor = useEntryEditor({ entries, onChange: setEntries, noun: 'kayıt', placeholder: 'Selin, Mert, Ece', disabled: busy })

  const draw = () =>
    run(async () => {
      if (!check.ok) return
      const result = drawWinners(pool, count)
      const key = uid()
      const poolSize = pool.length
      setLive('')
      setWinners(null)
      haptic(10)
      sfx.whoosh()
      if (!reduced) {
        setPhase('mix')
        await wait(650)
      }
      if (!mounted.current) return
      setWinners(result)
      setPhase('reveal')
      for (let i = 0; i < result.length; i++) {
        sfx.card()
        await wait(reduced ? 40 : Math.max(160, 420 - result.length * 25))
      }
      if (!mounted.current) return
      setPhase('done')
      setRound((r) => r + 1)
      if (removeDrawn) setDrawnIds((d) => [...d, ...result.map((r) => r.id)])
      sfx.win()
      const names = result.map((r) => r.name)
      setLive(result.length === 1 ? `Kura sonucu: ${names[0]}.` : `Kura sonucu, çekiliş sırasıyla: ${names.map((n, i) => `${i + 1}. ${n}`).join(', ')}.`)
      record(key, {
        tool: 'kura',
        title: result.length === 1 ? names[0] : `${result.length} kazanan`,
        detail: `${names.map((n, i) => (result.length > 1 ? `${i + 1}. ${n}` : n)).join(', ')} · ${poolSize} kayıt arasından${removeDrawn ? ', çıkarmalı' : ''}`,
      })
    })

  const resetPool = () => {
    setDrawnIds([])
    setWinners(null)
    setPhase('idle')
    setLive('Havuz sıfırlandı; tüm kayıtlar yeniden çekilebilir.')
  }

  const undo = (
    <li className="chips__item">
      <button type="button" className="sbtn sbtn--sm" aria-label="Son eklenen kaydı çıkar" title="Son eklenen kaydı çıkar" disabled={busy} onClick={editor.undoLast}>
        <Icon name="undo" size={16} />
      </button>
    </li>
  )

  const stage = (
    <>
      <div className="stage-body draw-stage">
        <div className="draw-main">
          {entries.length === 0 ? (
            <div className="stage-empty">
              <div className="stage-empty__art stage-empty__art--tickets" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <p>Alttaki kutuya kişi ya da seçenek yaz. Kaç kazanan çekileceğini aşağı kaydırınca ayarlarsın.</p>
            </div>
          ) : phase === 'reveal' || phase === 'done' ? (
            <ol className="tickets" aria-label="Kura sonucu">
              {winners?.map((w, i) => (
                <motion.li
                  key={w.id + round}
                  className="ticket"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -95, y: -40, scale: 0.9 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                  transition={
                    reduced
                      ? { duration: 0.15, delay: i * 0.04 }
                      : { type: 'spring', bounce: 0.3, duration: 0.7, delay: i * Math.max(0.16, 0.42 - winners.length * 0.025) }
                  }
                >
                  {winners.length > 1 && <span className="ticket__n">{i + 1}</span>}
                  <span className="ticket__name">{w.name}</span>
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className={`bowl${phase === 'mix' ? ' is-mixing' : ''}`} aria-hidden="true">
              {pool.slice(0, 14).map((e, i) => (
                <span key={e.id} className="bowl__slip" style={{ '--i': i, '--n': Math.min(pool.length, 14) } as CSSProperties} />
              ))}
              <span className="bowl__caption">{pool.length} kayıt havuzda</span>
            </div>
          )}
        </div>
        {pool.length > 0 && (
          <div className="draw-side">
            <EntryChips
              variant="list"
              entries={entries.filter((e) => !struck.has(e.id))}
              struck={new Set<string>()}
              disabled={busy}
              lead={undo}
              onRename={editor.rename}
              onRemove={editor.remove}
            />
          </div>
        )}
      </div>
      {entries.length > 0 && !check.ok && <Notice tone="error">{pool.length === 0 ? 'Havuzda çekilecek kayıt kalmadı. Havuzu sıfırla ya da yeni kayıt ekle.' : check.error}</Notice>}
      <StageBar
        right={
          <RoundButton
            icon="strike"
            label={removeDrawn ? 'Çekileni sonraki turlardan çıkar: açık' : 'Çekileni sonraki turlardan çıkar: kapalı'}
            on={removeDrawn}
            disabled={busy}
            onClick={() => setRemoveDrawn(!removeDrawn)}
          />
        }
      />
    </>
  )

  // Ayarlar yalnızca aşağı kaydırınca görünür.
  const controls = (
    <Group title="Çekiliş" id="kura-ayar">
      <Row label="Kazanan sayısı">
        <Stepper value={Math.min(count, maxCount)} min={1} max={maxCount} onChange={setCount} label="Kazanan sayısı" disabled={busy || pool.length === 0} />
      </Row>
      {removeDrawn && entries.length > 0 && (
        <Row label="Çekilenleri geri koy" hint={`${pool.length} / ${entries.length} kayıt çekilebilir`}>
          <Button variant="plain" icon="refresh" onClick={resetPool} disabled={busy || drawnIds.length === 0}>
            Sıfırla
          </Button>
        </Row>
      )}
    </Group>
  )

  const action = exhausted ? (
    <Button variant="primary" size="lg" block icon="refresh" onClick={resetPool} disabled={busy}>
      Havuzu sıfırla
    </Button>
  ) : (
    <Button variant="primary" size="lg" block onClick={draw} disabled={busy || !check.ok}>
      {busy ? 'Çekiliyor…' : phase === 'done' ? 'Yeniden çek' : count > 1 ? `${count} kazanan çek` : 'Kura çek'}
    </Button>
  )

  return (
    <ToolScaffold
      tool="kura"
      stage={stage}
      onReset={() => {
        setEntries([])
        setDrawnIds([])
        setWinners(null)
        setPhase('idle')
        setLive('Sıfırlandı.')
      }}
      resetDisabled={busy || (entries.length === 0 && !winners)}
      controls={controls}
      action={action}
      adder={editor.adder}
      extra={editor.listActions}
      overlays={editor.sheets}
      live={live}
      banner={banner}
      rules={[
        'Havuzdaki her kaydın seçilme olasılığı eşittir.',
        'Bir çekilişte aynı kayıt birden fazla kez seçilmez.',
        'Kazanan sayısı havuzdaki kayıt sayısını geçemez; sayıyı aşağı kaydırınca ayarlarsın.',
        'Sağ alttaki çizgili düğme açıkken çekilen kayıt sonraki turlardan çıkar ve listede üstü çizili görünür.',
        'Bir adı düzenlemek için dokun; silmek için basılı tutup alttaki çöp kutusuna sürükle. Soldaki ok son eklenen adı çıkarır.',
      ]}
    />
  )
}
