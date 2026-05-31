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
          'bg-primary/10 text-primary': variant === 'default' || variant === 'primary',
          'bg-green-50 text-green-600': variant === 'success',
          'bg-orange-50 text-orange-600': variant === 'warning',
          'bg-red-50 text-red-600': variant === 'danger',
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
