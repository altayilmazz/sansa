import './styles/fonts.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './state/store'
import './styles/tokens.css'
import './styles/app.css'
import './styles/shell.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)

// Service worker yalnızca üretim derlemesinde ve desteklenen tarayıcılarda kaydedilir.
// Capacitor kabuğunda dosyalar zaten yerelde olduğundan zararsızdır.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* çevrimdışı destek olmadan da uygulama çalışır */
    })
  })
}
