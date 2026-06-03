import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusTagType = 'archive' | 'stock' | 'borrow'

interface StatusTagProps {
  type?: StatusTagType
  value?: number
  remainDays?: number
  /** 旧 API 兼容（直接传入 status + label） */
  status?: number
  label?: string
}

const archiveMap: Record<number, { label: string; className: string }> = {
  0: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  1: { label: '待审核', className: 'bg-yellow-50 text-yellow-700' },
  2: { label: '待确认', className: 'bg-blue-50 text-blue-700' },
  3: { label: '已归档', className: 'bg-emerald-50 text-emerald-700' },
  10: { label: '销毁待审批', className: 'bg-violet-50 text-violet-700' },
  11: { label: '已销毁', className: 'bg-red-50 text-red-700' },
}

const stockMap: Record<number, { label: string; className: string }> = {
  1: { label: '在库', className: 'bg-primary/10 text-primary-dark' },
  0: { label: '借出', className: 'bg-orange-50 text-orange-700' },
}

function getBorrowStyle(status: number, remainDays?: number): { label: string; className: string } {
  if (status === 0) return { label: '待审批', className: 'bg-slate-100 text-slate-600' }
  if (status === 1) {
    const days = remainDays ?? 999
    if (days <= 0) return { label: `逾期${Math.abs(days)}天`, className: 'bg-red-50 text-red-700' }
    if (days <= 3) return { label: `即将到期·剩余${days}天`, className: 'bg-orange-50 text-orange-700' }
    return { label: `已借出·剩余${days}天`, className: 'bg-primary/10 text-primary-dark' }
  }
  if (status === 2) return { label: '已驳回', className: 'bg-red-50 text-red-700' }
  if (status === 3) return { label: '已归还', className: 'bg-emerald-50 text-emerald-700' }
  if (status === 4) {
    if (remainDays !== undefined && remainDays < 0) {
      return { label: `已逾期 ${Math.abs(remainDays)} 天`, className: 'bg-red-50 text-red-700' }
    }
    return { label: '逾期未还', className: 'bg-red-50 text-red-700' }
  }
  return { label: String(status), className: 'bg-slate-100 text-slate-600' }
}

export default function StatusTag({ type, value, remainDays, status, label }: StatusTagProps) {
  /* ── 旧 API 兼容 ─────────────────────────────────────────── */
  if (label !== undefined && status !== undefined) {
    const variant =
      status === 3
        ? 'success'
        : status === 1 || status === 2
          ? 'warning'
          : 'default'
    return <Badge variant={variant as 'default' | 'success' | 'warning'}>{label}</Badge>
  }

  const numValue = Number(value ?? status ?? 0)

  if (type === 'archive') {
    const style = archiveMap[numValue] ?? { label: String(numValue), className: 'bg-slate-100 text-slate-600' }
    return (
      <span className={cn('inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-medium', style.className)}>
        {style.label}
      </span>
    )
  }

  if (type === 'stock') {
    const style = stockMap[numValue] ?? { label: String(numValue), className: 'bg-slate-100 text-slate-600' }
    return (
      <span className={cn('inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-medium', style.className)}>
        {style.label}
      </span>
    )
  }

  if (type === 'borrow') {
    const style = getBorrowStyle(numValue, remainDays)
    return (
      <span className={cn('inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-medium', style.className)}>
        {style.label}
      </span>
    )
  }

  return <Badge>{label ?? String(numValue)}</Badge>
}
