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
  objects/             SVG/CSS nesne çizimleri ve animasyonları: Wheel, Coin, Die, PlayingCard, CardFan, Squirrel (yalnızca Tura yüzündeki amblem)
  tools/               Altı aracın ekranları
  ui/                  Ortak bileşenler (düğme, segment, liste düzenleyici, alt sayfa, karşılaşma)
  features/            Sentezlenmiş sesler ve titreşim
  styles/              tokens.css (tasarım değişkenleri) ve app.css
```

**İlke:** Her araç önce sonucu `lib/rules` ile hesaplar, ardından animasyonu yalnızca bu sonucu gösterecek şekilde çalıştırır. Çarkın hedef açısı (`planSpin`), paranın son açısı ve zarın son yönü sonuçtan türetilir; animasyon süresi ya da zamanlaması sonucu etkilemez. Animasyon sürerken `useBusy` kilidi ikinci bir sonucu engeller; geçmiş kaydı tur tamamlandığında bir kez yazılır.

## Tasarım

- Üç tema (Ayarlar → Görünüm): Sistem/Koyu (iOS koyu modu), Açık ve Özel (Claude'un sıcak koyu paleti, turuncu vurgu). Tema `<html data-theme>` ile seçilir; çark, kura kasesi, biletler ve paralar da temaya göre renk değiştirir (`styles/tokens.css`).
- Tek eylem rengi; her aracın sahnesinde küçük bir yardımcı renk.
- Apple cihazlarda SF Pro, diğerlerinde paketle gelen Inter (çevrimdışı çalışır).
- Araç açıkken üst çubuk kalkar, içerik ekranı doldurur. Altta: seçili sekmeye bağlı araç şeridi (başparmak erişimi), onun altında solda Şansa işareti ve panelin tam ortasında “Ana sayfa” düğmesi. Geçmiş ve Ayarlar ana sayfadaki üst çubuktan açılır.
- Mobilde ana eylem panelin içindeki alt çubuktadır; masaüstünde sahne solda sabit kalır, ayarlar sağda listelenir.
- Ana ekran yalnızca altı araç bloğundan oluşur (`pages/Board.tsx`). Geniş ekranda tıklanan blok büyüyerek pencereye dönüşür, diğerleri sağında sütun olur; başka bir bloğa tıklayınca yer değiştirirler. Dar ekranda (<860 px) sekmeler içeriğin altına, başparmağın erişeceği yere sonsuz kayan bir şerit olarak dizilir: seçili sekme sabit yuvasında kalır ve panel ondan yukarı açılır, ötekiler seçili yuvanın üstünden atlayarak kayar; bırakınca seçili araç denk geldiği aralığa yerleşir (`pages/TabStrip.tsx`). Sekme sayısı sekiz: altı karar aracı, Mayın tarlası (2×2–6×6 kare ızgara, seçilen sayıda gizli mayın; mayına basılınca oyun biter) ve Rastgele sayı. Araç adı başlığı yoktur, seçili sekme gösterir. Pencereyi kapatmak için alttaki “Ana sayfa” düğmesi kullanılır. Kurallar, örnekler, kayıtlı listeler ve listeyi temizleme, alt çubuktaki ⓘ düğmesinin penceresindedir. Girişleri sürükleyip kırmızı çöp alanına bırakarak silebilir, dokunarak düzenleyebilirsin; kura listesi düz yazı olarak alt alta dizilir. Hareket yalnızca görünümdür ve sonuçlara dokunmaz.
- “Hareketi azalt” sistem tercihi ve uygulama ayarı desteklenir; ses varsayılan olarak kapalıdır.

## PWA ve çevrimdışı

- `public/manifest.webmanifest`, SVG + PNG ikonlar (192, 512, maskable 512, apple-touch-icon 180).
- `vite.config.ts` içindeki küçük eklenti, derleme çıktısındaki tüm dosyaları listeleyen `sw.js` üretir. İlk başarılı yüklemede her şey önbelleğe alınır; sonraki açılışlar çevrimdışı çalışır.
- Service worker yalnızca üretim derlemesinde kaydedilir.

## Yayınlama (GitHub Pages)

`.github/workflows/pages.yml`, `main` dalına her gönderimde testleri çalıştırır, uygulamayı derler ve GitHub Pages'e yayınlar. Depoda bir kez **Settings → Pages → Build and deployment → Source: GitHub Actions** seçilmelidir. Yol göreli (`base: './'`) ve yönlendirme `#` tabanlı olduğundan uygulama `kullanici.github.io/depo/` gibi alt yolda da çalışır.

Telefonda ana ekrana eklemek için yayınlanan adresi aç: iPhone'da Safari → Paylaş → Ana Ekrana Ekle; Android'de Chrome menüsü → Uygulamayı yükle. İlk açılıştan sonra çevrimdışı da çalışır. Yeni sürüm yayınlandığında uygulamayı kapatıp iki kez açmak gerekebilir (eski önbellek önce kullanılır).

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
8. Mağaza için: uygulama ikonları ve açılış görselleri (`@capacitor/assets`), gizlilik metni (veri toplanmıyor, her şey cihazda).

## Bilinen sınırlar

- Geçmiş en fazla 40 tur, kayıtlı listeler en fazla 20 liste tutar.
- Rastgelelik tarayıcının Web Crypto API'sine dayanır; bağımsız denetim ya da doğrulanabilir adalet iddiası yoktur.
