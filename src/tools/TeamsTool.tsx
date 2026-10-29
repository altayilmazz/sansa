import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { makeEntries, type Entry } from '../lib/entries'
import { uid } from '../lib/random'
import { makeTeams, MAX_TEAMS, MIN_TEAMS, planTeams, TEAM_NAMES } from '../lib/rules/teams'
import { haptic, sfx } from '../features/sound'
import { useBusy, useMounted, useReducedMotion, wait } from '../state/hooks'
import { usePersistent, useStore } from '../state/store'
import { isEntryList } from '../lib/storage'
import { copyText } from '../ui/clipboard'
import { Button, Group, Notice, Row, Stepper } from '../ui/controls'
import { useEntryEditor } from '../ui/EntryEditor'
import { useExample } from '../ui/ExampleBanner'
import { ToolScaffold } from '../ui/ToolScaffold'

const TEAM_TINTS = ['#ff6b5e', '#4ea8ff', '#30d158', '#ffd60a', '#ff9f0a', '#bf8cff', '#f4f1ea', '#98989d']

const isNum = (v: unknown): v is number => typeof v === 'number'

export function TeamsTool() {
  const [entries, setEntries] = usePersistent<Entry[]>('takim:list', [], isEntryList)
  const [count, setCount] = usePersistent('takim:count', 2, isNum)
  const [teams, setTeams] = useState<Entry[][] | null>(null)
  const [phase, setPhase] = useState<'idle' | 'shuffle' | 'deal' | 'done'>('idle')
  const [copied, setCopied] = useState(false)
  const [live, setLive] = useState('')
  const { busy, run } = useBusy()
  const reduced = useReducedMotion()
  const mounted = useMounted()
  const { record } = useStore()

  const banner = useExample('takim', (e) => {
    const prev = { entries, count }
    setEntries(makeEntries(e.names ?? []))
    if (e.teams) setCount(e.teams)
    return () => {
      setEntries(prev.entries)
      setCount(prev.count)
    }
  })

  const plan = planTeams(entries.length, count)
  const signature = useMemo(() => entries.map((e) => e.id + e.name).join('|') + '#' + count, [entries, count])

  // Liste ya da takım sayısı değişince eski sonuç geçersizdir.
  useEffect(() => {
    if (!busy) {
      setTeams(null)
      setPhase('idle')
      setCopied(false)
    }
  }, [signature])

  const deal = () =>
    run(async () => {
      if (!plan.ok) return
      // Önce sonuç hesaplanır; animasyon yalnızca bu sonucu gösterir.
      const result = makeTeams(entries, count)
      const key = uid()
      setCopied(false)
      setLive('')
      sfx.whoosh()
      haptic(10)
      if (!reduced) {
        setTeams(null)
        setPhase('shuffle')
        await wait(520)
      }
      if (!mounted.current) return
      setTeams(result)
      setPhase('deal')
      const total = entries.length
      await wait(reduced ? 150 : Math.min(1500, 260 + total * 75))
      if (!mounted.current) return
      setPhase('done')
      sfx.reveal()
      const summary = result.map((t, i) => `${TEAM_NAMES[i]}: ${t.map((p) => p.name).join(', ')}`).join('. ')
      setLive(`Takımlar hazır. ${summary}.`)
      record(key, {
        tool: 'takim',
        title: `${count} takım, ${total} kişi`,
        detail: result.map((t, i) => `${TEAM_NAMES[i]}: ${t.map((p) => p.name).join(', ')}`).join('\n'),
      })
    })

  const copy = async () => {
    if (!teams) return
    const text = teams.map((t, i) => `${TEAM_NAMES[i]} (${t.length})\n${t.map((p) => `• ${p.name}`).join('\n')}`).join('\n\n')
    const ok = await copyText(`Şansa · Takımlar\n\n${text}`)
    setCopied(ok)
    setLive(ok ? 'Takımlar panoya kopyalandı.' : 'Kopyalanamadı.')
  }

  const showTeams = teams && (phase === 'deal' || phase === 'done')

  const stage = (
    <div className="teams-stage">
      <LayoutGroup>
        {!showTeams ? (
          entries.length === 0 ? (
            <div className="stage-empty">
              <div className="stage-empty__art" aria-hidden="true">
                <span />
                <span />
              </div>
              <p>Kişileri ekle, takım sayısını seç. Herkes rastgele ve olabildiğince eşit sayıda dağıtılır.</p>
            </div>
          ) : (
            <div className={`pile${phase === 'shuffle' ? ' is-shuffling' : ''}`} aria-label="Dağıtılacak kişiler">
              {entries.map((e, i) => (
                <motion.span
                  key={e.id}
                  layoutId={reduced ? undefined : `p-${e.id}`}
                  className="chip"
                  style={{ '--i': i } as CSSProperties}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                >
                  {e.name}
                </motion.span>
              ))}
            </div>
          )
        ) : (
          <div className="teams" style={{ '--cols': Math.min(teams.length, 4) } as CSSProperties}>
            {teams.map((team, ti) => (
              <section key={ti} className="team" style={{ '--team': TEAM_TINTS[ti] } as CSSProperties} aria-label={`${TEAM_NAMES[ti]}, ${team.length} kişi`}>
                <header className="team__head">
                  <span className="team__dot" aria-hidden="true" />
                  <h3 className="team__name">{TEAM_NAMES[ti]}</h3>
                  <span className="team__count">{team.length}</span>
                </header>
                <ul className="team__list">
                  {team.map((p, pi) => {
                    const order = pi * teams.length + ti
                    return (
                      <motion.li
                        key={p.id}
                        layoutId={reduced ? undefined : `p-${p.id}`}
                        className="chip chip--team"
                        initial={reduced ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        transition={reduced ? { duration: 0.15 } : { type: 'spring', bounce: 0.22, duration: 0.6, delay: Math.min(order * 0.075, 1.2) }}
                      >
                        {p.name}
                      </motion.li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </LayoutGroup>
    </div>
  )

  const editor = useEntryEditor({ entries: entries, onChange: setEntries, noun: 'kişi', placeholder: 'Ayşe, Mehmet, Can', disabled: busy })

  const controls = (
    <>
      <Group title="Kişiler" id="takim-kisiler">
        {editor.body}
      </Group>
      <Group title="Takımlar" id="takim-ayar">
        <Row label="Takım sayısı" hint={plan.ok ? (plan.even ? `Her takımda ${plan.sizes[0]} kişi` : undefined) : undefined}>
          <Stepper value={count} min={MIN_TEAMS} max={MAX_TEAMS} onChange={setCount} label="Takım sayısı" disabled={busy} />
        </Row>
      </Group>
      <AnimatePresence initial={false}>
        {entries.length > 0 && !plan.ok && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Notice tone="error">{plan.error}</Notice>
          </motion.div>
        )}
        {plan.ok && !plan.even && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Notice tone="warn">{plan.note}</Notice>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  const done = phase === 'done' && teams
  const action = (
    <>
      {done && (
        <div className="actionbar__secondary">
          <Button variant="secondary" icon={copied ? 'check' : 'copy'} onClick={copy}>
            {copied ? 'Kopyalandı' : 'Metin olarak kopyala'}
          </Button>
        </div>
      )}
      <Button variant="primary" size="lg" block icon={done ? 'shuffle' : undefined} onClick={deal} disabled={busy || !plan.ok}>
        {busy ? 'Dağıtılıyor…' : done ? 'Yeniden karıştır' : 'Takımlara ayır'}
      </Button>
    </>
  )

  return (
    <ToolScaffold
      tool="takim"
      topBar={editor.adder}
      stage={stage}
      controls={controls}
      action={action}
      live={live}
      banner={banner}
      rules={[
        'Herkes tam olarak bir takımda yer alır.',
        'Kişi sayıları en fazla bir farkla eşitlenir; tam eşit olmuyorsa önceden belirtilir.',
        'Dağıtım tamamen rastgeledir; yetenek ya da güç dengesi gözetilmez.',
      ]}
    />
  )
}
