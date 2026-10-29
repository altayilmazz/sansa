export type ToolId = 'takim' | 'cark' | 'kura' | 'para' | 'zar' | 'kart' | 'mayin' | 'sayi' | 'sise' | 'parmak' | 'rulet' | 'yaris' | 'satranc'

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
  sise: { id: 'sise', name: 'Şişe çevirmece', short: 'Şişe', blurb: 'Şişeyi çevir, ağzı kimi gösterirse o.', tint: 'var(--tint-sise)' },
  parmak: { id: 'parmak', name: 'Parmak seçici', short: 'Parmak', blurb: 'Herkes parmağını koysun, biri seçilsin.', tint: 'var(--tint-parmak)' },
  rulet: { id: 'rulet', name: 'Rus ruleti', short: 'Rulet', blurb: 'Tetiği çek; mermi çıkarsa oyun biter.', tint: 'var(--tint-rulet)' },
  yaris: { id: 'yaris', name: 'At yarışı', short: 'Yarış', blurb: 'Bir ata dokun, yarışı izle.', tint: 'var(--tint-yaris)' },
  satranc: { id: 'satranc', name: 'Hızlı satranç', short: 'Satranç', blurb: 'Rastgele oynanan satranç; mat eden renk kazanır.', tint: 'var(--tint-satranc)' },
}

export const TOOL_ORDER: ToolId[] = ['takim', 'cark', 'kura', 'para', 'zar', 'kart', 'mayin', 'sayi', 'sise', 'parmak', 'rulet', 'yaris', 'satranc']

export const isToolId = (v: unknown): v is ToolId => typeof v === 'string' && v in TOOLS
