import { cn } from '@/lib/utils'
import { useVisualViewport } from '@/hooks/useVisualViewport'

interface BottomActionBarProps {
  children: React.ReactNode
  className?: string
}

/**
 * 底部固定操作栏（手机端）。
 * 自动监听 virtual keyboard 弹出，避免被顶出可视区。
 * 电脑端通过传入 className 自行控制布局（如 sticky）。
 */
export default function BottomActionBar({ children, className }: BottomActionBarProps) {
  const keyboardHeight = useVisualViewport()

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] transition-[bottom] duration-200',
        className
      )}
      style={{
        bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  )
}
