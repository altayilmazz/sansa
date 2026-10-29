import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { setSoundEnabled } from './features/sound'
import { Board } from './pages/Board'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { useMedia, useReducedMotion } from './state/hooks'
import { href, parseRoute, useHash, type Route } from './state/router'
import { useStore } from './state/store'
import { applyTheme, resolveTheme } from './state/theme'
import { TOOLS } from './state/tools'
import { BrandMark } from './ui/Brand'

const LINKS: { route: Route; label: string }[] = [
  { route: { name: 'home' }, label: 'Araçlar' },
  { route: { name: 'history' }, label: 'Geçmiş' },
  { route: { name: 'settings' }, label: 'Ayarlar' },
]

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
            const on = l.route.name === route.name
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

  const systemDark = useMedia('(prefers-color-scheme: dark)')

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound])
  useEffect(() => applyTheme(resolveTheme(settings.theme, systemDark)), [settings.theme, systemDark])
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
  // Araç açıkken üst çubuk yoktur: içerik ekranı doldurur, gezinme alttaki satırdadır.
  const inTool = route.name === 'tool'

  return (
    // Hareket azaltma her bileşende açıkça ele alınır; Motion'ın otomatik kısması
    // dönüş açılarını atlayıp sonuçla görüntüyü ayırabileceği için kapalıdır.
    <MotionConfig reducedMotion="never">
      <a className="skip" href="#icerik">
        İçeriğe geç
      </a>
      {!inTool && <SiteNav route={route} />}
      <main id="icerik" className={`main${inTool ? ' is-tool' : ''}`}>
        {onBoard && <Board selected={route.name === 'tool' ? route.tool : null} />}
        {route.name === 'history' && <History />}
        {route.name === 'settings' && <Settings />}
      </main>
    </MotionConfig>
  )
}
