import { cn } from '@/lib/utils'
import { LazyImage } from './LazyImage'

interface EmptyStateProps {
  description?: string
  imageSrc?: string
  imageAlt?: string
  className?: string
}

/**
 * 空状态组件
 *
 * 支持可选的插画图片，图片通过 LazyImage 懒加载，
 * 减少首屏非关键图片资源请求。
 */
export default function EmptyState({
  description = '暂无数据',
  imageSrc,
  imageAlt = '空状态插画',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {imageSrc ? (
        <LazyImage
          src={imageSrc}
          alt={imageAlt}
          className="w-16 h-16 mb-3 rounded-full"
          imgClassName="object-contain"
          placeholder={<div className="w-16 h-16 rounded-full bg-slate-100" />}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-slate-100 mb-3" />
      )}
      <p className="text-sm text-slate-body">{description}</p>
    </div>
  )
}
