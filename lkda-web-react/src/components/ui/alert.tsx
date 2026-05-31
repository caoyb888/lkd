import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        {
          'bg-slate-50 text-slate-title': variant === 'default',
          'bg-red-50 text-red-600 border-red-200': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  )
}

export { Alert }
