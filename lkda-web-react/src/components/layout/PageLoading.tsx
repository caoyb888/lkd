export default function PageLoading() {
  return (
    <div className="flex min-h-screen flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 bg-[var(--color-bg-soft)] border-b border-[var(--color-border-light)]" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton - desktop only */}
        <div className="hidden lg:block w-[220px] bg-[var(--color-bg-soft)] border-r border-[var(--color-border-light)] shrink-0" />
        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="h-8 w-1/3 rounded bg-[var(--color-skeleton)]" />
          <div className="h-40 rounded-lg bg-[var(--color-skeleton)]" />
          <div className="h-40 rounded-lg bg-[var(--color-skeleton)]" />
        </div>
      </div>
    </div>
  )
}
