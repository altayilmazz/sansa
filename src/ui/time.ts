const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
const dtf = new Intl.DateTimeFormat('tr', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function relativeTime(at: number, now = Date.now()): string {
  const s = Math.round((at - now) / 1000)
  if (Math.abs(s) < 45) return 'şimdi'
  const m = Math.round(s / 60)
  if (Math.abs(m) < 60) return rtf.format(m, 'minute')
  const h = Math.round(m / 60)
  if (Math.abs(h) < 24) return rtf.format(h, 'hour')
  const d = Math.round(h / 24)
  if (Math.abs(d) < 7) return rtf.format(d, 'day')
  return dtf.format(at)
}

export function fullTime(at: number): string {
  return dtf.format(at)
}
