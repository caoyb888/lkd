import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  className?: string
}

export default function PageHeader({ title, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-4', className)}>
      <h2 className="text-xl font-bold text-slate-title">{title}</h2>
    </div>
  )
}
