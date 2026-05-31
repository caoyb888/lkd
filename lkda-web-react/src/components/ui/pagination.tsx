import { cn } from '@/lib/utils'
import { Button } from './button'

interface PaginationProps {
  current: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination({ current, total, onChange }: PaginationProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2 mt-4')}>
      <Button
        size="sm"
        variant="outline"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        上一页
      </Button>
      <span className="text-sm text-slate-body">
        {current} / {total}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={current >= total}
        onClick={() => onChange(current + 1)}
      >
        下一页
      </Button>
    </div>
  )
}
