import { LayoutGrid, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/hooks/useViewMode'

interface ViewModeToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

/**
 * 列表 / 卡片 视图切换分段控件。全站列表页统一使用，配合 useViewMode 记忆选择。
 */
export default function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-0.5',
        className
      )}
      role="group"
      aria-label="切换列表 / 卡片视图"
    >
      <button
        type="button"
        aria-pressed={value === 'table'}
        onClick={() => onChange('table')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors',
          value === 'table'
            ? 'bg-[var(--color-bg-main)] text-primary-dark shadow-sm'
            : 'text-slate-body hover:text-slate-title'
        )}
      >
        <LayoutList size={14} />
        列表
      </button>
      <button
        type="button"
        aria-pressed={value === 'card'}
        onClick={() => onChange('card')}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors',
          value === 'card'
            ? 'bg-[var(--color-bg-main)] text-primary-dark shadow-sm'
            : 'text-slate-body hover:text-slate-title'
        )}
      >
        <LayoutGrid size={14} />
        卡片
      </button>
    </div>
  )
}
