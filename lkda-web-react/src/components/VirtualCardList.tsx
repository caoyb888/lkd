import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

interface VirtualCardListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  className?: string
  emptyState?: React.ReactNode
  loading?: boolean
  loadingSkeleton?: React.ReactNode
}

/**
 * 基于 @tanstack/react-virtual 的虚拟滚动卡片列表
 * 适用于手机端长列表，避免一次性渲染大量 DOM 节点
 *
 * 使用示例：
 * <VirtualCardList
 *   items={records}
 *   estimateSize={180}
 *   renderItem={(vol) => <VolumeCard data={vol} />}
 *   emptyState={<EmptyState description="暂无数据" />}
 * />
 */
export function VirtualCardList<T>({
  items,
  renderItem,
  estimateSize = 180,
  overscan = 3,
  className,
  emptyState,
  loading,
  loadingSkeleton,
}: VirtualCardListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan,
  })

  if (loading && loadingSkeleton) {
    return <div className={className}>{loadingSkeleton}</div>
  }

  if (items.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
