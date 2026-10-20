const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export function toDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false
  return !Number.isNaN(parseDateKey(value).getTime())
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  // 用本地中午避免时区和夏令时把日期挪动一天。
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0)
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

/** 目标日期 - 起始日期，单位：天。 */
export function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((utcTo - utcFrom) / 86_400_000)
}

export function formatDateCN(key: string, today = toDateKey()): string {
  const date = parseDateKey(key)
  const sameYear = date.getFullYear() === parseDateKey(today).getFullYear()
  const base = `${date.getMonth() + 1}月${date.getDate()}日`
  return sameYear ? base : `${date.getFullYear()}年${base}`
}

export function formatRelativeDate(key: string, today = toDateKey()): string {
  const diff = daysBetween(today, key)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff < 0) return `逾期 ${Math.abs(diff)} 天`
  if (diff <= 7) return `${diff} 天后`
  return formatDateCN(key, today)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** 把任意可解析的日期输入规范成 YYYY-MM-DD；失败时返回 fallback。 */
export function coerceDateKey(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const raw = value.trim()
  if (isDateKey(raw)) return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return fallback
  return toDateKey(date)
}

export function coerceIso(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const date = new Date(value.trim())
  if (Number.isNaN(date.getTime())) return fallback
  return date.toISOString()
}
