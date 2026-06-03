export default function PageLoading() {
  return (
    <div className="flex min-h-screen flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 bg-slate-100 border-b border-slate-200" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar skeleton - desktop only */}
        <div className="hidden lg:block w-[220px] bg-slate-100 border-r border-slate-200 shrink-0" />
        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="h-8 w-1/3 rounded bg-slate-200" />
          <div className="h-40 rounded-lg bg-slate-200" />
          <div className="h-40 rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
