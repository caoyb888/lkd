import { cn } from '@/lib/utils'

interface ArchiveNoPreviewProps {
  archiveNo: string
  className?: string
}

export default function ArchiveNoPreview({
  archiveNo,
  className,
}: ArchiveNoPreviewProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-card bg-primary/5 border border-primary/20 text-center',
        className
      )}
    >
      <div className="text-xs text-slate-body mb-1">档号预览</div>
      <div className="text-lg font-bold text-primary">{archiveNo}</div>
    </div>
  )
}
