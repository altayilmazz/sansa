import { AnimatePresence, motion } from 'motion/react'
import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { addNames, duplicateKeys, normalize, type Entry } from '../lib/entries'
import { useStore } from '../state/store'
import { useReducedMotion } from '../state/hooks'
import { Button, IconButton, Notice } from './controls'
import { Icon } from './Icon'
import { Sheet } from './Sheet'

interface Options {
  entries: Entry[]
  onChange: (next: Entry[]) => void
  /** "kişi", "seçenek" gibi. */
  noun: string
  placeholder: string
  disabled?: boolean
  max?: number
  /** Kayıtlı listelerden yükleme ve listeyi kaydetme. */
  lists?: boolean
}

interface EntryEditor {
  /** Tek satırlık ekleme çubuğu: aracın en üstüne yerleştirilir. */
  adder: ReactNode
  /** Sayaç, liste araçları ve kayıtların listesi: kontroller bölümüne yerleştirilir. */
  body: ReactNode
}

/**
 * Kişi/seçenek listesinin düzenleyicisi. Ekleme çubuğu ile liste aynı durumu
 * paylaşır ama farklı yerlerde durabilsin diye iki parça olarak döner.
 */
export function useEntryEditor({ entries, onChange, noun, placeholder, disabled, max = 60, lists = true }: Options): EntryEditor {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [sheet, setSheet] = useState<null | 'save' | 'load'>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reduced = useReducedMotion()
  const dups = useMemo(() => duplicateKeys(entries), [entries])

  const addText = (text: string) => {
    const res = addNames(entries, text)
    if (res.added === 0) {
      setMessage({ tone: 'error', text: `Eklenecek ${noun} yok. Boş satırlar ve yalnızca boşluk içeren kayıtlar atlanır.` })
      return
    }
    if (res.entries.length > max) {
      setMessage({ tone: 'error', text: `En fazla ${max} ${noun} eklenebilir. Şu an ${entries.length} ${noun} var.` })
      return
    }
    onChange(res.entries)
    setDraft('')
    if (res.duplicates.length) {
      const names = [...new Set(res.duplicates)].map((n) => `“${n}”`).join(', ')
      setMessage({
        tone: 'warn',
        text: `${names} listede birden fazla kez var. Hepsi ayrı kayıt olarak tutuldu; farklı kişilerse düzenleyerek ayırt edebilirsin (ör. “Ali K.”).`,
      })
    } else {
      setMessage({ tone: 'info', text: `${res.added} ${noun} eklendi.` })
    }
    inputRef.current?.focus()
  }

  const commitEdit = (e: Entry) => {
    const clean = editText.replace(/\s+/g, ' ').trim()
    if (!clean) {
      setMessage({ tone: 'error', text: 'İsim boş bırakılamaz. Silmek istiyorsan çöp kutusu düğmesini kullan.' })
      return
    }
    onChange(entries.map((x) => (x.id === e.id ? { ...x, name: clean } : x)))
    setEditing(null)
    setMessage(null)
  }

  const remove = (e: Entry) => {
    onChange(entries.filter((x) => x.id !== e.id))
    setMessage({ tone: 'info', text: `“${e.name}” silindi.` })
  }

  const label = noun[0].toLocaleUpperCase('tr-TR') + noun.slice(1) + ' ekle'

  const adder = (
    <div className="adder">
      <form
        className="adder__row"
        onSubmit={(e) => {
          e.preventDefault()
          addText(draft)
        }}
      >
        <label className="sr-only" htmlFor={`${id}-in`}>
          {label}
        </label>
        <input
          id={`${id}-in`}
          ref={inputRef}
          className="field adder__input"
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-describedby={message ? `${id}-msg` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            // Tek satırlık kutu satır sonlarını silerdi; çok satırlı yapıştırmayı doğrudan listeye ekle.
            const pasted = e.clipboardData.getData('text')
            if (/[\r\n]/.test(pasted.trim())) {
              e.preventDefault()
              addText(draft ? `${draft}\n${pasted}` : pasted)
            }
          }}
        />
        <Button variant="secondary" type="submit" icon="plus" disabled={disabled}>
          Ekle
        </Button>
      </form>
      <div id={`${id}-msg`} aria-live="polite">
        {message &&
          (message.tone === 'info' ? (
            // Başarı bildirimi yalnızca ekran okuyucuya; görünür geri bildirim listenin kendisi.
            <span className="sr-only">{message.text}</span>
          ) : (
            <Notice tone={message.tone}>{message.text}</Notice>
          ))}
      </div>
    </div>
  )

  const body = (
    <div className="editor">
      <div className="editor__bar">
        <span className="editor__count">
          {entries.length} {noun}
        </span>
        <div className="editor__tools">
          {lists && (
            <>
              <Button variant="plain" icon="list" onClick={() => setSheet('load')} disabled={disabled}>
                Listeler
              </Button>
              <Button variant="plain" icon="bookmark" onClick={() => setSheet('save')} disabled={disabled || entries.length === 0}>
                Kaydet
              </Button>
            </>
          )}
          {entries.length > 0 && (
            <Button
              variant="plain"
              icon="trash"
              disabled={disabled}
              onClick={() => {
                onChange([])
                setMessage({ tone: 'info', text: 'Liste temizlendi.' })
              }}
            >
              Temizle
            </Button>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <ul className="editor__list" aria-label={`${noun} listesi`}>
          <AnimatePresence initial={false}>
            {entries.map((e, i) => {
              const dup = dups.has(normalize(e.name))
              return (
                <motion.li
                  key={e.id}
                  className="editor__item"
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24, transition: { duration: 0.18 } }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                >
                  <span className="editor__index" aria-hidden="true">
                    {i + 1}
                  </span>
                  {editing === e.id ? (
                    <form
                      className="editor__edit"
                      onSubmit={(ev) => {
                        ev.preventDefault()
                        commitEdit(e)
                      }}
                    >
                      <input
                        className="field field--inline"
                        aria-label={`“${e.name}” için yeni isim`}
                        value={editText}
                        autoFocus
                        onChange={(ev) => setEditText(ev.target.value)}
                        onKeyDown={(ev) => ev.key === 'Escape' && setEditing(null)}
                      />
                      <IconButton icon="check" label="Kaydet" type="submit" />
                      <IconButton icon="close" label="Vazgeç" onClick={() => setEditing(null)} />
                    </form>
                  ) : (
                    <>
                      <span className="editor__name">{e.name}</span>
                      {dup && <span className="badge badge--warn">Aynı isim</span>}
                      <IconButton
                        icon="pencil"
                        label={`“${e.name}” düzenle`}
                        disabled={disabled}
                        onClick={() => {
                          setEditing(e.id)
                          setEditText(e.name)
                        }}
                      />
                      <IconButton icon="trash" label={`“${e.name}” sil`} disabled={disabled} onClick={() => remove(e)} />
                    </>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      {lists && (
        <ListsSheet
          mode={sheet}
          onClose={() => setSheet(null)}
          entries={entries}
          onLoad={(list) => {
            onChange(list.map((x) => ({ ...x })))
            setMessage({ tone: 'info', text: `Kayıtlı liste yüklendi (${list.length} ${noun}).` })
            setSheet(null)
          }}
          onSaved={(name) => {
            setMessage({ tone: 'info', text: `Liste “${name}” adıyla kaydedildi.` })
            setSheet(null)
          }}
          noun={noun}
        />
      )}
    </div>
  )

  return { adder, body }
}

function ListsSheet({
  mode,
  onClose,
  entries,
  onLoad,
  onSaved,
  noun,
}: {
  mode: null | 'save' | 'load'
  onClose: () => void
  entries: Entry[]
  onLoad: (e: Entry[]) => void
  onSaved: (name: string) => void
  noun: string
}) {
  const { savedLists, saveList, deleteList } = useStore()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const id = useId()
  return (
    <Sheet open={mode !== null} onClose={onClose} title={mode === 'save' ? 'Listeyi kaydet' : 'Kayıtlı listeler'}>
      {mode === 'save' ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            const clean = name.replace(/\s+/g, ' ').trim()
            if (!clean) {
              setError('Listeye bir ad ver.')
              return
            }
            saveList(clean, entries)
            setName('')
            setError('')
            onSaved(clean)
          }}
        >
          <label className="editor__label" htmlFor={`${id}-name`}>
            Liste adı
          </label>
          <input
            id={`${id}-name`}
            className="field"
            value={name}
            placeholder="ör. Perşembe halı saha"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            autoFocus
          />
          {error && (
            <p className="field-error" id={`${id}-err`}>
              {error}
            </p>
          )}
          <p className="editor__hint">
            {entries.length} {noun} bu cihazda saklanır. Aynı adla kaydedilen liste güncellenir.
          </p>
          <Button variant="primary" type="submit" block>
            Kaydet
          </Button>
        </form>
      ) : savedLists.length === 0 ? (
        <p className="empty">Henüz kayıtlı liste yok. Bir listeyi “Kaydet” ile sakladığında burada görünür.</p>
      ) : (
        <ul className="saved">
          {savedLists.map((l) => (
            <li key={l.id} className="saved__item">
              <button type="button" className="saved__load" onClick={() => onLoad(l.entries)}>
                <span className="saved__name">{l.name}</span>
                <span className="saved__meta">
                  {l.entries.length} kayıt · {l.entries.slice(0, 3).map((e) => e.name).join(', ')}
                  {l.entries.length > 3 ? '…' : ''}
                </span>
              </button>
              <IconButton icon="trash" label={`“${l.name}” listesini sil`} onClick={() => deleteList(l.id)} />
            </li>
          ))}
        </ul>
      )}
      {mode === 'load' && (
        <p className="editor__hint">
          <Icon name="info" size={14} /> Yüklenen liste mevcut listenin yerine geçer.
        </p>
      )}
    </Sheet>
  )
}
