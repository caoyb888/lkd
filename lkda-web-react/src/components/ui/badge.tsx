import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-primary/15 text-primary-light': variant === 'default' || variant === 'primary',
          'bg-emerald-500/15 text-emerald-300': variant === 'success',
          'bg-amber-500/15 text-amber-300': variant === 'warning',
          'bg-red-500/15 text-red-300': variant === 'danger',
          'border border-[var(--color-border-light)] bg-transparent text-[var(--color-slate-body)]':
            variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
