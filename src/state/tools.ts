export type ToolId = 'takim' | 'cark' | 'kura' | 'para' | 'zar' | 'kart' | 'mayin' | 'sayi' | 'parmak' | 'rulet' | 'satranc' | 'sicak'

export interface ToolMeta {
  id: ToolId
  name: string
  /** Dar yerlerde (kenar şeridi) kullanılan kısa ad. */
  short: string
  /** Blokta kısa açıklama. */
  blurb: string
  /** Araca ait yardımcı renk (CSS değişkeni adı). */
  tint: string
}

export const TOOLS: Record<ToolId, ToolMeta> = {
  takim: { id: 'takim', name: 'Takım oluştur', short: 'Takım', blurb: 'Grubu rastgele ve eşit sayıda takımlara böl.', tint: 'var(--tint-takim)' },
  cark: { id: 'cark', name: 'Çark çevir', short: 'Çark', blurb: 'Seçenekler arasından çarkla karar ver.', tint: 'var(--tint-cark)' },
  kura: { id: 'kura', name: 'Kura çek', short: 'Kura', blurb: 'Listeden bir ya da birkaç kişi seç.', tint: 'var(--tint-kura)' },
  para: { id: 'para', name: 'Yazı tura', short: 'Yazı tura', blurb: 'Tek atış ya da iki kişilik karşılaşma.', tint: 'var(--tint-para)' },
  zar: { id: 'zar', name: 'Zar at', short: 'Zar', blurb: 'Bir ya da iki zar; yüksek toplam kazanır.', tint: 'var(--tint-zar)' },
  kart: { id: 'kart', name: 'Kart çek', short: 'Kart', blurb: '52 kartlık deste; yüksek kart kazanır.', tint: 'var(--tint-kart)' },
  mayin: { id: 'mayin', name: 'Mayın tarlası', short: 'Mayın', blurb: 'Kareleri aç; mayın patlarsa oyun biter.', tint: 'var(--tint-mayin)' },
  sayi: { id: 'sayi', name: 'Rastgele sayı', short: 'Sayı', blurb: 'İstediğin aralıkta rastgele sayılar üret.', tint: 'var(--tint-sayi)' },
  parmak: { id: 'parmak', name: 'Parmak seçici', short: 'Parmak', blurb: 'Herkes parmağını koysun, biri seçilsin.', tint: 'var(--tint-parmak)' },
  rulet: { id: 'rulet', name: 'Rus ruleti', short: 'Rulet', blurb: 'Tetiği çek; mermi çıkarsa oyun biter.', tint: 'var(--tint-rulet)' },
  satranc: { id: 'satranc', name: 'Hızlı satranç', short: 'Satranç', blurb: 'Rastgele oynanan satranç; mat eden renk kazanır.', tint: 'var(--tint-satranc)' },
  sicak: { id: 'sicak', name: 'Sıcak patates', short: 'Patates', blurb: 'Gizli süre bitince telefon kimdeyse o kaybeder.', tint: 'var(--tint-sicak)' },
}

/** Parmakla ya da elden ele oynanan araçlar yalnızca dokunmatik cihazlarda gösterilir. */
const TOUCH_ONLY: ToolId[] = ['parmak', 'sicak']
const touch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches

export const TOOL_ORDER: ToolId[] = (['takim', 'cark', 'kura', 'para', 'zar', 'kart', 'mayin', 'sayi', 'parmak', 'rulet', 'satranc', 'sicak'] as ToolId[]).filter((id) => touch || !TOUCH_ONLY.includes(id))

export const isToolId = (v: unknown): v is ToolId => typeof v === 'string' && v in TOOLS
/** Bu cihazda gösterilen araç mı? (Geçmiş kayıtları için isToolId yeterlidir.) */
export const isAvailableTool = (v: unknown): v is ToolId => isToolId(v) && TOOL_ORDER.includes(v)
