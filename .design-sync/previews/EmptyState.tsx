import { EmptyState } from 'lkda-web-react'

export function Default() {
  return (
    <div className="w-80 rounded-card border border-[var(--color-border-light)]">
      <EmptyState description="暂无符合条件的档案" />
    </div>
  )
}
