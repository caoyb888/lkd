import { cn } from '@/lib/utils'

interface EmptyStateProps {
  description?: string
  className?: string
}

export default function EmptyState({
  description = '暂无数据',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="w-16 h-16 rounded-full bg-slate-100 mb-3" />
      <p className="text-sm text-slate-body">{description}</p>
    </div>
  )
}
