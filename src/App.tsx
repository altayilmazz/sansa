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
import { Icon, type IconName } from './ui/Icon'

const LINKS: { route: Route; label: string; icon: IconName }[] = [
  { route: { name: 'home' }, label: 'Araçlar', icon: 'grid' },
  { route: { name: 'history' }, label: 'Geçmiş', icon: 'clock' },
  { route: { name: 'settings' }, label: 'Ayarlar', icon: 'gear' },
]

/** Altta sabit gezinme: solda ana sayfa (logo), sağda araçlar, geçmiş ve ayarlar. */
function Dock({ route }: { route: Route }) {
  return (
    <nav className="dock" aria-label="Ana gezinme">
      <div className="dock__inner">
        <a className="dock__btn dock__home" href={href({ name: 'home' })} aria-label="Ana sayfa" title="Ana sayfa">
          <Icon name="home" size={22} />
        </a>
        <div className="dock__links">
          {LINKS.map((l) => {
            const on = l.route.name === 'home' ? route.name === 'home' || route.name === 'tool' : l.route.name === route.name
            return (
              <a key={l.label} className={`dock__btn${on ? ' is-on' : ''}`} href={href(l.route)} aria-label={l.label} title={l.label} aria-current={on ? 'page' : undefined}>
                <Icon name={l.icon} size={21} />
              </a>
            )
          })}
        </div>
      </div>
    </nav>
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
  // Araç açıkken içerik ekranı doldurur; gezinme her sayfada alttaki dock'tadır.
  const inTool = route.name === 'tool'

  return (
    // Hareket azaltma her bileşende açıkça ele alınır; Motion'ın otomatik kısması
    // dönüş açılarını atlayıp sonuçla görüntüyü ayırabileceği için kapalıdır.
    <MotionConfig reducedMotion="never">
      <a className="skip" href="#icerik">
        İçeriğe geç
      </a>
      <main id="icerik" className={`main${inTool ? ' is-tool' : ''}`}>
        {onBoard && <Board selected={route.name === 'tool' ? route.tool : null} />}
        {route.name === 'history' && <History />}
        {route.name === 'settings' && <Settings />}
      </main>
      <Dock route={route} />
    </MotionConfig>
  )
}
