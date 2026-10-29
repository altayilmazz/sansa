import { useId, useRef, useState, type ReactNode } from 'react'
import { addNames, type Entry } from '../lib/entries'
import { useStore } from '../state/store'
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
}

export interface EntryEditor {
  /** Alt çubukta, ana düğmenin üstünde duran tek satırlık ekleme çubuğu. */
  adder: ReactNode
  /** Bilgi penceresindeki liste işlemleri: Listeler, Kaydet, Temizle. */
  listActions: (close: () => void) => ReactNode
  /** Kayıtlı listeler penceresi; aracın içinde bir yerde bir kez çizilmelidir. */
  sheets: ReactNode
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  /** Son eklenen kaydı çıkarır (yanlış ekleneni düzeltmek için). */
  undoLast: () => void
}

/**
 * Kişi/seçenek listesinin mantığı. Liste ekranda sahnede çizilir; bu kanca
 * yalnızca ekleme çubuğunu, işlemleri ve kayıtlı listeler penceresini verir.
 */
export function useEntryEditor({ entries, onChange, noun, placeholder, disabled, max = 60 }: Options): EntryEditor {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null)
  const [sheet, setSheet] = useState<null | 'save' | 'load'>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
        text: `${names} listede birden fazla kez var. Ayrı kayıt olarak tutuldu; farklı kişilerse dokunup düzenleyerek ayırt edebilirsin (ör. “Ali K.”).`,
      })
    } else {
      setMessage({ tone: 'info', text: `${res.added} ${noun} eklendi.` })
    }
    inputRef.current?.focus()
  }

  const rename = (rid: string, name: string) => {
    const clean = name.replace(/\s+/g, ' ').trim()
    if (!clean) return
    onChange(entries.map((x) => (x.id === rid ? { ...x, name: clean } : x)))
    setMessage(null)
  }

  const remove = (rid: string) => {
    const gone = entries.find((x) => x.id === rid)
    onChange(entries.filter((x) => x.id !== rid))
    if (gone) setMessage({ tone: 'info', text: `“${gone.name}” silindi.` })
  }

  const undoLast = () => {
    const last = entries[entries.length - 1]
    if (!last) return
    onChange(entries.slice(0, -1))
    setMessage({ tone: 'info', text: `“${last.name}” çıkarıldı.` })
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
            // Başarı bildirimi yalnızca ekran okuyucuya; görünür geri bildirim sahnedeki liste.
            <span className="sr-only">{message.text}</span>
          ) : (
            <Notice tone={message.tone}>{message.text}</Notice>
          ))}
      </div>
    </div>
  )

  const listActions = (close: () => void) => (
    <section className="info" aria-labelledby={`${id}-list`}>
      <h3 className="info__title" id={`${id}-list`}>
        Liste
      </h3>
      <div className="info__actions">
        <Button
          variant="secondary"
          icon="list"
          disabled={disabled}
          onClick={() => {
            close()
            setSheet('load')
          }}
        >
          Kayıtlı listeler
        </Button>
        <Button
          variant="secondary"
          icon="bookmark"
          disabled={disabled || entries.length === 0}
          onClick={() => {
            close()
            setSheet('save')
          }}
        >
          Listeyi kaydet
        </Button>
        <Button
          variant="secondary"
          icon="trash"
          disabled={disabled || entries.length === 0}
          onClick={() => {
            onChange([])
            setMessage({ tone: 'info', text: 'Liste temizlendi.' })
            close()
          }}
        >
          Listeyi temizle
        </Button>
      </div>
    </section>
  )

  const sheets = (
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
  )

  return { adder, listActions, sheets, rename, remove, undoLast }
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
