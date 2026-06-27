import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-btn font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 ring-offset-[var(--color-bg-page)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          {
            'bg-primary text-[#06201c] font-semibold hover:bg-primary-dark shadow-sm':
              variant === 'primary',
            'bg-transparent border border-[var(--color-border-medium)] hover:bg-[var(--color-bg-soft)] text-[var(--color-slate-title)]':
              variant === 'outline',
            'bg-transparent hover:bg-[var(--color-bg-soft)] text-[var(--color-slate-title)]':
              variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 shadow-sm':
              variant === 'danger',
            'text-primary underline-offset-4 hover:underline bg-transparent':
              variant === 'link',
            'h-8 px-3 text-sm gap-1.5': size === 'sm',
            'h-10 px-4 text-sm gap-2': size === 'md',
            'h-12 px-6 text-base gap-2': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
