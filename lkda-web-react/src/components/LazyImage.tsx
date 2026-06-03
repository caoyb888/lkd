import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  alt: string
  placeholder?: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  className?: string
  imgClassName?: string
}

/**
 * 懒加载图片组件
 *
 * 特性：
 * 1. 基于 IntersectionObserver 的原生懒加载（兼容 loading="lazy" 作为兜底）
 * 2. 加载中显示骨架占位
 * 3. 加载失败显示 fallback
 * 4. 支持自定义 rootMargin（提前预加载距离）
 *
 * 使用示例：
 * <LazyImage
 *   src="/illustration-empty.svg"
 *   alt="空状态插画"
 *   className="w-32 h-32"
 * />
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  rootMargin = '100px',
  className,
  imgClassName,
  ...imgProps
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // 优先使用原生 loading="lazy"，IntersectionObserver 作为增强
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  const showImage = inView || loaded

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {/* 占位骨架 */}
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholder ?? (
            <div className="h-full w-full animate-pulse rounded bg-slate-100" />
          )}
        </div>
      )}

      {/* 加载失败 fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback ?? (
            <div className="flex flex-col items-center gap-1 text-slate-300">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-xs">图片加载失败</span>
            </div>
          )}
        </div>
      )}

      {/* 实际图片：原生 lazy + IntersectionObserver 双重保障 */}
      {showImage && (
        <img
          {...imgProps}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true)
            setLoaded(true)
          }}
        />
      )}
    </div>
  )
}
