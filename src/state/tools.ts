export type ToolId = 'takim' | 'cark' | 'kura' | 'para' | 'zar' | 'kart'

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
}

export const TOOL_ORDER: ToolId[] = ['takim', 'cark', 'kura', 'para', 'zar', 'kart']

export const isToolId = (v: unknown): v is ToolId => typeof v === 'string' && v in TOOLS
