import { detectDynamicIsland } from '../features/island'
import { sfx } from '../features/sound'
import { storageAvailable } from '../lib/storage'
import { useMedia } from '../state/hooks'
import { HISTORY_LIMIT, useStore, type IslandPref, type MotionPref } from '../state/store'
import { Button, Group, Row, Segmented, Switch } from '../ui/controls'

export function Settings() {
  const { settings, setSettings, announce } = useStore()
  const island = detectDynamicIsland()
  const finePointer = useMedia('(hover: hover) and (pointer: fine)')
  const stored = storageAvailable()

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="largetitle">Ayarlar</h1>
      </header>

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

      <Group
        title="Dinamik Ada"
        id="ayar-ada"
        footer={
          island.likely
            ? 'Bu cihazda Dinamik Ada bulunuyor gibi görünüyor. Kazanan, ekranın üstündeki adada da gösterilir.'
            : 'Bu cihazda Dinamik Ada algılanmadı. İstersen sonucu ekranın üstünde ada biçiminde yine de gösterebilirsin.'
        }
      >
        <Row label="Sonucu adada göster" hint="Algılama, ekran ölçüsü ve cihaz türüne dayalı bir tahmindir.">
          <Segmented<IslandPref>
            label="Dinamik Ada"
            value={settings.island}
            onChange={(v) => setSettings({ island: v })}
            options={[
              { value: 'otomatik', label: 'Otomatik' },
              { value: 'her-zaman', label: 'Her zaman' },
              { value: 'kapali', label: 'Kapalı' },
            ]}
          />
        </Row>
        <Row label="Önizle">
          <Button variant="secondary" onClick={() => announce({ tool: 'kura', headline: 'Örnek bildirim', detail: 'Kazanan burada görünür' })}>
            Göster
          </Button>
        </Row>
      </Group>

      <Group title="Masaüstü" id="ayar-masaustu" footer={finePointer ? undefined : 'Bu cihazda fare algılanmadığı için sincap gösterilmez.'}>
        <Row label="İmleci kovalayan sincap" hint="Ekranın altında yürür, imlece bakar ve yaklaşınca zıplar.">
          <Switch checked={settings.squirrel} label="İmleci kovalayan sincap" onChange={(v) => setSettings({ squirrel: v })} />
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
