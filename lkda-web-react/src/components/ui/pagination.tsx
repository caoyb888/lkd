import { cn } from '@/lib/utils'
import { Button } from './button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  current: number
  total: number
  onChange: (page: number) => void
}

function generatePageList(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
}

export default function Pagination({
  current,
  total,
  onChange,
}: PaginationProps) {
  const pages = generatePageList(current, total)

  if (total <= 1) return null

  return (
    <div className={cn('flex items-center justify-end gap-1.5 mt-4 flex-wrap')}>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={current <= 1}
        onClick={() => onChange(1)}
      >
        <ChevronsLeft size={14} />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        <ChevronLeft size={14} />
      </Button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">
            ...
          </span>
        ) : (
          <Button
            key={page}
            size="sm"
            variant={current === page ? 'primary' : 'outline'}
            className="h-8 min-w-[32px] px-2"
            onClick={() => onChange(page as number)}
          >
            {page}
          </Button>
        )
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={current >= total}
        onClick={() => onChange(current + 1)}
      >
        <ChevronRight size={14} />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        disabled={current >= total}
        onClick={() => onChange(total)}
      >
        <ChevronsRight size={14} />
      </Button>

      <span className="text-sm text-slate-body ml-2">
        共 {total} 页
      </span>
    </div>
  )
}
