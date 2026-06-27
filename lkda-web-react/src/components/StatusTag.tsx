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

/* 暗色(STRATA)适配的状态配色：半透明填充 + 亮色文字，保留多色语义区分 */
const TAG = {
  slate: 'bg-slate-500/20 text-slate-300',
  amber: 'bg-amber-500/15 text-amber-300',
  sky: 'bg-sky-500/15 text-sky-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  violet: 'bg-violet-500/15 text-violet-300',
  red: 'bg-red-500/15 text-red-300',
  orange: 'bg-orange-500/15 text-orange-300',
  teal: 'bg-primary/15 text-primary-light',
} as const

const archiveMap: Record<number, { label: string; className: string }> = {
  0: { label: '草稿', className: TAG.slate },
  1: { label: '待审核', className: TAG.amber },
  2: { label: '待确认', className: TAG.sky },
  3: { label: '已归档', className: TAG.emerald },
  10: { label: '销毁待审批', className: TAG.violet },
  11: { label: '已销毁', className: TAG.red },
}

const stockMap: Record<number, { label: string; className: string }> = {
  1: { label: '在库', className: TAG.teal },
  0: { label: '借出', className: TAG.orange },
}

function getBorrowStyle(status: number, remainDays?: number): { label: string; className: string } {
  if (status === 0) return { label: '待审批', className: TAG.slate }
  if (status === 1) {
    const days = remainDays ?? 999
    if (days <= 0) return { label: `逾期${Math.abs(days)}天`, className: TAG.red }
    if (days <= 3) return { label: `即将到期·剩余${days}天`, className: TAG.orange }
    return { label: `已借出·剩余${days}天`, className: TAG.teal }
  }
  if (status === 2) return { label: '已驳回', className: TAG.red }
  if (status === 3) return { label: '已归还', className: TAG.emerald }
  if (status === 4) {
    if (remainDays !== undefined && remainDays < 0) {
      return { label: `已逾期 ${Math.abs(remainDays)} 天`, className: TAG.red }
    }
    return { label: '逾期未还', className: TAG.red }
  }
  return { label: String(status), className: TAG.slate }
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
    const style = archiveMap[numValue] ?? { label: String(numValue), className: TAG.slate }
    return (
      <span className={cn('inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-medium', style.className)}>
        {style.label}
      </span>
    )
  }

  if (type === 'stock') {
    const style = stockMap[numValue] ?? { label: String(numValue), className: TAG.slate }
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
