# Şansa

Gündelik kararları ve arkadaşlar arası şans karşılaşmalarını hızlandıran, hesap ve sunucu gerektirmeyen bir PWA.

Araçlar: **Takım oluştur**, **Çark çevir**, **Kura çek**, **Yazı tura**, **Zar at**, **Kart çek**.

## Başlatma

```bash
npm install
npm run dev        # geliştirme sunucusu (http://localhost:5173)
npm test           # kural ve rastgelelik testleri (Vitest)
npm run build      # tip denetimi + üretim derlemesi → dist/
npm run preview    # derlenmiş sürümü yerelde sun (service worker yalnızca burada etkin)
```

Node 20+ önerilir (Node 24 ile denendi).

## Yapı

```
src/
  lib/                 Saf mantık; React'e bağlı değildir
    random.ts          Web Crypto, reddetmeli örnekleme (modulo yanlılığı yok), Fisher–Yates
    entries.ts         İsim ayrıştırma, aynı isim tespiti
    storage.ts         Güvenli localStorage (okunamazsa varsayılanla devam eder)
    rules/             teams, wheel, draw, coin, dice, cards, match
  state/               Ayarlar, kayıtlı listeler, geçmiş, yönlendirme (hash), örnekler
  objects/             SVG/CSS nesne çizimleri ve animasyonları: Wheel, Coin, Die, PlayingCard, CardFan, Squirrel
  tools/               Altı aracın ekranları
  ui/                  Ortak bileşenler (düğme, segment, liste düzenleyici, alt sayfa, karşılaşma)
  features/            Dinamik Ada, sincap imleç takipçisi, sentezlenmiş sesler
  styles/              tokens.css (tasarım değişkenleri) ve app.css
```

**İlke:** Her araç önce sonucu `lib/rules` ile hesaplar, ardından animasyonu yalnızca bu sonucu gösterecek şekilde çalıştırır. Çarkın hedef açısı (`planSpin`), paranın son açısı ve zarın son yönü sonuçtan türetilir; animasyon süresi ya da zamanlaması sonucu etkilemez. Animasyon sürerken `useBusy` kilidi ikinci bir sonucu engeller; geçmiş kaydı tur tamamlandığında bir kez yazılır.

## Tasarım

- Koyu, iOS koyu moduna yakın yüzeyler (`#000`, `#1c1c1e`, `#2c2c2e`) ve sıcak kırık beyaz metin (`#f4f1ea`).
- Tek eylem rengi (`#0a84ff`); her aracın sahnesinde küçük bir yardımcı renk.
- Apple cihazlarda SF Pro, diğerlerinde paketle gelen Inter (çevrimdışı çalışır).
- Mobilde ana eylem başparmak bölgesindeki sabit alt çubuktadır; masaüstünde sahne solda sabit kalır, ayarlar sağda listelenir.
- Ana ekran yalnızca altı araç bloğundan oluşur (`pages/Board.tsx`). Bir bloğa tıklayınca blok büyüyerek pencereye dönüşür, diğerleri sağında (dar ekranda üstte) sırayla dizilir; başka bir bloğa tıklayınca yer değiştirirler. Hareket tek bir Motion `layout` animasyonudur ve sonuçlara dokunmaz.
- “Hareketi azalt” sistem tercihi ve uygulama ayarı desteklenir; ses varsayılan olarak kapalıdır.

### Dinamik Ada

Web'den donanım sorgulanamadığı için Dinamik Ada'lı iPhone'lar ekran ölçüsü ve cihaz türünden **tahmin edilir** (`features/island.tsx`). Ayarlardan “Otomatik / Her zaman / Kapalı” seçilebilir. Ana ekrana eklenmiş (tam ekran) modda ada, gerçek adanın konumuna oturur; tarayıcıda ekranın üstünde yüzer.

### Sincap

Yalnızca fare kullanan cihazlarda ve hareket azaltılmamışsa görünür. Ekranın altında imlecin x konumuna koşar, durunca imlece bakar, imleç zeminden ~210 px yakına inince zıplar. Tıklamaları engellemez; ayarlardan kapatılabilir.

## PWA ve çevrimdışı

- `public/manifest.webmanifest`, SVG + PNG ikonlar (192, 512, maskable 512, apple-touch-icon 180).
- `vite.config.ts` içindeki küçük eklenti, derleme çıktısındaki tüm dosyaları listeleyen `sw.js` üretir. İlk başarılı yüklemede her şey önbelleğe alınır; sonraki açılışlar çevrimdışı çalışır.
- Service worker yalnızca üretim derlemesinde kaydedilir.

## Mobil uygulamaya geçiş (Capacitor)

Proje Capacitor'a uygun kuruldu: göreli yollar (`base: './'`), hash tabanlı yönlendirme, sunucu ve harici varlık yok. İleride:

1. `npm i @capacitor/core && npm i -D @capacitor/cli`
2. `npx cap init Şansa com.ornek.sansa --web-dir dist`
3. `npm i @capacitor/ios @capacitor/android` → `npx cap add ios` / `npx cap add android`
4. Her değişiklikte `npm run build && npx cap sync`
5. Önerilen eklentiler:
   - `@capacitor/preferences`: `src/lib/storage.ts` içindeki arka ucu değiştirmek için (iOS'ta WebView depolaması temizlenebilir).
   - `@capacitor/haptics`: `features/sound.ts` içindeki `haptic()` için (iOS'ta `navigator.vibrate` yok).
   - `@capacitor/status-bar`, `@capacitor/splash-screen`: koyu durum çubuğu ve açılış ekranı.
6. Yerel kabukta service worker gerekmez; `main.tsx` yalnızca `http(s)` şemasında kaydeder.
7. Gerçek Dinamik Ada / Canlı Etkinlik (Live Activities) için iOS tarafında ActivityKit ile yerel bir eklenti yazmak gerekir; web sürümündeki ada yalnızca görsel bir benzetimdir.
8. Mağaza için: uygulama ikonları ve açılış görselleri (`@capacitor/assets`), gizlilik metni (veri toplanmıyor, her şey cihazda).

## Bilinen sınırlar

- Dinamik Ada algılaması bir tahmindir; gelecekteki iPhone ölçüleri `DI_SCREENS` listesine eklenmelidir.
- Geçmiş en fazla 40 tur, kayıtlı listeler en fazla 20 liste tutar.
- Rastgelelik tarayıcının Web Crypto API'sine dayanır; bağımsız denetim ya da doğrulanabilir adalet iddiası yoktur.
