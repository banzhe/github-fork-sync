const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** 例如 "3 minutes ago". 一分钟以内显示 "just now". */
export function formatRelative(date: Date, now = Date.now()) {
  const diff = date.getTime() - now
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}
