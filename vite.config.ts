import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Derleme çıktısındaki tüm dosyaları listeleyen bir service worker üretir.
 * Böylece ilk başarılı yüklemeden sonra uygulama çevrimdışı açılabilir.
 * Ek bağımlılık gerektirmez; Capacitor kabuğunda da zararsızdır.
 */
function serviceWorker(): Plugin {
  return {
    name: 'sansa-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const precache = ['./', ...files, 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png']
      const version = Date.now().toString(36)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'sansa-${version}';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })));
});
`,
      })
    },
  }
}

export default defineConfig({
  // Göreli yollar: Capacitor (file/capacitor şeması) ve alt dizinde barındırma için.
  base: './',
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
