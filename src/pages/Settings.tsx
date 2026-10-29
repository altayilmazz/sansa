import { sfx } from '../features/sound'
import { storageAvailable } from '../lib/storage'
import { HISTORY_LIMIT, useStore, type MotionPref } from '../state/store'
import type { Lang } from '../state/i18n'
import type { ThemePref } from '../state/theme'
import { Group, Row, Segmented, Switch } from '../ui/controls'

export function Settings() {
  const { settings, setSettings } = useStore()
  const stored = storageAvailable()

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="largetitle">Ayarlar</h1>
      </header>

      <Group title="Görünüm" id="ayar-tema">
        <Row label="Tema">
          <Segmented<ThemePref>
            label="Tema"
            value={settings.theme}
            onChange={(v) => setSettings({ theme: v })}
            options={[
              { value: 'sistem', label: 'Sistem' },
              { value: 'acik', label: 'Açık' },
              { value: 'koyu', label: 'Koyu' },
              { value: 'ozel', label: 'Özel' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Dil" id="ayar-dil">
        <Row label="Dil" hint="Language">
          <Segmented<Lang>
            label="Dil"
            value={settings.lang}
            onChange={(v) => setSettings({ lang: v })}
            options={[
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Ses ve hareket" id="ayar-ses">
        <Row label="Ses efektleri" hint="Varsayılan olarak kapalı. Sonuçlar sessizken de ekranda ve ekran okuyucuda açıkça gösterilir.">
          <Switch
            checked={settings.sound}
            label="Ses efektleri"
            onChange={(v) => {
              setSettings({ sound: v })
              if (v) setTimeout(() => sfx.reveal(), 30)
            }}
          />
        </Row>
        <Row label="Hareket" hint="“Azalt” seçildiğinde çark, para ve zar kısa geçişlerle sonuca gider.">
          <Segmented<MotionPref>
            label="Hareket"
            value={settings.motion}
            onChange={(v) => setSettings({ motion: v })}
            options={[
              { value: 'sistem', label: 'Sistem' },
              { value: 'azalt', label: 'Azalt' },
              { value: 'tam', label: 'Tam' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Veri ve rastgelelik" id="ayar-veri">
        <div className="prose">
          <p>
            Sonuçlar, tarayıcının Web Crypto API’si ile üretilen rastgele sayılardan hesaplanır. Sonuç animasyondan önce belirlenir; animasyon yalnızca bu sonucu gösterir.
          </p>
          <p>
            Hesap ya da sunucu yok. Ayarlar, kayıtlı listeler ve son {HISTORY_LIMIT} tur yalnızca bu cihazda saklanır.
            {!stored && ' Şu an tarayıcı yerel depolamaya izin vermiyor; değişiklikler sayfa kapanınca kaybolur.'}
          </p>
        </div>
      </Group>
    </div>
  )
}
