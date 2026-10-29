import type { ToolId } from './tools'

/**
 * Ana ekrandaki örnek senaryolar. Bunlar yalnızca araçları doldurmak için
 * hazır verilerdir; geçmişe yazılmaz ve gerçek sonuç gibi gösterilmez.
 */
export interface Example {
  id: string
  tool: ToolId
  title: string
  line: string
  names?: string[]
  teams?: number
  winners?: number
  players?: [string, string]
}

export const EXAMPLES: Example[] = [
  {
    id: 'halisaha',
    tool: 'takim',
    title: '5’e 5 halı saha',
    line: '10 kişiyi iki takıma böl.',
    names: ['Arda', 'Burak', 'Cem', 'Deniz', 'Efe', 'Furkan', 'Gökhan', 'Hakan', 'İlker', 'Kaan'],
    teams: 2,
  },
  {
    id: 'yemek',
    tool: 'cark',
    title: 'Akşam ne yesek?',
    line: 'Altı seçenekli bir çark.',
    names: ['Pide', 'Mantı', 'Lahmacun', 'Köfte', 'Sushi', 'Makarna'],
  },
  {
    id: 'bulasik',
    tool: 'kura',
    title: 'Bulaşığı kim yıkar?',
    line: 'Dört kişiden biri.',
    names: ['Selin', 'Mert', 'Ece', 'Onur'],
    winners: 1,
  },
  {
    id: 'kimbaslar',
    tool: 'para',
    title: 'Kim başlar?',
    line: 'İki kişi, yazı tura.',
    players: ['Zeynep', 'Emre'],
  },
]

let pending: Example | null = null

export function setPendingExample(e: Example) {
  pending = e
}

/** Aracın açılışında bir kez okunur. */
export function takePendingExample(tool: ToolId): Example | null {
  if (pending?.tool !== tool) return null
  const e = pending
  // StrictMode başlatıcıyı iki kez çağırabilir; temizliği bir sonraki tura bırak.
  setTimeout(() => {
    if (pending === e) pending = null
  }, 0)
  return e
}
