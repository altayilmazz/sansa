import { useState } from 'react'
import { HISTORY_LIMIT, useStore } from '../state/store'
import { TOOLS } from '../state/tools'
import { ToolGlyph } from '../objects/ToolGlyph'
import { Button } from '../ui/controls'
import { fullTime, relativeTime } from '../ui/time'

export function History() {
  const { history, clearHistory } = useStore()
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="page">
      <header className="page__head">
        <h1 className="largetitle">Geçmiş</h1>
        <p className="page__lede">Bu cihazda tamamlanan son {HISTORY_LIMIT} tur saklanır.</p>
      </header>
      {history.length === 0 ? (
        <p className="empty">Henüz tamamlanmış bir tur yok. Bir aracı kullandığında sonuçlar burada listelenir.</p>
      ) : (
        <>
          <ol className="history">
            {history.map((h) => (
              <li key={h.id} className="history__item">
                <span className="history__glyph">
                  <ToolGlyph tool={h.tool} size={28} />
                </span>
                <div className="history__body">
                  <div className="history__top">
                    <span className="history__tool">{TOOLS[h.tool].name}</span>
                    <time dateTime={new Date(h.at).toISOString()} title={fullTime(h.at)}>
                      {relativeTime(h.at)}
                    </time>
                  </div>
                  <p className="history__title">{h.title}</p>
                  <p className="history__detail">{h.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="page__foot">
            {confirm ? (
              <div className="confirm" role="group" aria-label="Geçmişi temizlemeyi onayla">
                <span>Tüm geçmiş silinsin mi?</span>
                <Button variant="plain" onClick={() => setConfirm(false)}>
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    clearHistory()
                    setConfirm(false)
                  }}
                >
                  Geçmişi sil
                </Button>
              </div>
            ) : (
              <Button variant="plain" icon="trash" onClick={() => setConfirm(true)}>
                Geçmişi temizle
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
