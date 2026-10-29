import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { DynamicIsland } from './features/island'
import { setSoundEnabled } from './features/sound'
import { SquirrelChaser } from './features/SquirrelChaser'
import { Board } from './pages/Board'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { useReducedMotion } from './state/hooks'
import { href, parseRoute, useHash, type Route } from './state/router'
import { useStore } from './state/store'
import { TOOLS } from './state/tools'

const LINKS: { route: Route; label: string }[] = [
  { route: { name: 'home' }, label: 'Araçlar' },
  { route: { name: 'history' }, label: 'Geçmiş' },
  { route: { name: 'settings' }, label: 'Ayarlar' },
]

/** Araç sayfaları da "Araçlar" bağlantısını etkin gösterir. */
function isActive(current: Route, r: Route) {
  if (r.name === 'home') return current.name === 'home' || current.name === 'tool'
  return current.name === r.name
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="6" fill="#efe9dc" />
      <circle cx="8" cy="8" r="1.9" fill="#1d1d1f" />
      <circle cx="16" cy="16" r="1.9" fill="#1d1d1f" />
      <circle cx="12" cy="12" r="2" fill="#0071e3" />
    </svg>
  )
}

function SiteNav({ route }: { route: Route }) {
  return (
    <header className="sitenav">
      <nav className="sitenav__inner" aria-label="Ana gezinme">
        <a className="sitenav__brand" href={href({ name: 'home' })}>
          <BrandMark />
          Şansa
        </a>
        <div className="sitenav__links">
          {LINKS.map((l) => {
            const on = isActive(route, l.route)
            return (
              <a key={l.label} className="sitenav__link" href={href(l.route)} aria-current={on ? 'page' : undefined}>
                {l.label}
              </a>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

export function App() {
  const hash = useHash()
  const route = parseRoute(hash)
  const { settings } = useStore()
  const reduced = useReducedMotion()

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full'
  }, [reduced])

  useEffect(() => {
    const title =
      route.name === 'tool' ? `${TOOLS[route.tool].name} · Şansa` : route.name === 'history' ? 'Geçmiş · Şansa' : route.name === 'settings' ? 'Ayarlar · Şansa' : 'Şansa'
    document.title = title
    // Araç penceresi kendi başlığına odaklanır; diğer sayfalarda ana başlığa.
    if (route.name !== 'tool') {
      window.scrollTo({ top: 0 })
      const h1 = document.querySelector<HTMLElement>('main h1')
      h1?.setAttribute('tabindex', '-1')
      h1?.focus({ preventScroll: true })
    }
  }, [hash])

  const onBoard = route.name === 'home' || route.name === 'tool'

  return (
    // Hareket azaltma her bileşende açıkça ele alınır; Motion'ın otomatik kısması
    // dönüş açılarını atlayıp sonuçla görüntüyü ayırabileceği için kapalıdır.
    <MotionConfig reducedMotion="never">
      <a className="skip" href="#icerik">
        İçeriğe geç
      </a>
      <SiteNav route={route} />
      <main id="icerik" className="main">
        {onBoard && <Board selected={route.name === 'tool' ? route.tool : null} />}
        {route.name === 'history' && <History />}
        {route.name === 'settings' && <Settings />}
      </main>
      <DynamicIsland />
      <SquirrelChaser />
    </MotionConfig>
  )
}
