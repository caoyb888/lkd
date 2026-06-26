import { Skeleton } from 'lkda-web-react'

export function Shapes() {
  return (
    <div className="w-72 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}
