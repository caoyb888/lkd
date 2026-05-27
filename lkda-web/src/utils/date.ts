/**
 * 将后端返回的 "yyyy-MM-dd HH:mm:ss" 或 ISO 字符串截取为 "yyyy-MM-dd"。
 * 若值为 null/undefined/空字符串，返回 '—'。
 */
export function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  return val.slice(0, 10)
}

/**
 * 将后端返回的 "yyyy-MM-dd HH:mm:ss" 格式化为 "yyyy-MM-dd HH:mm"。
 * 若值为 null/undefined/空字符串，返回 '—'。
 */
export function fmtDateTime(val: string | null | undefined): string {
  if (!val) return '—'
  return val.slice(0, 16).replace('T', ' ')
}
