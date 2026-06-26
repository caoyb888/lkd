import { SkeletonText } from 'lkda-web-react'

export function ThreeLines() {
  return (
    <div className="w-72">
      <SkeletonText lines={3} />
    </div>
  )
}
