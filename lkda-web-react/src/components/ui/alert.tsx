import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const variantIconMap = {
  default: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: XCircle,
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const Icon = variantIconMap[variant]
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          {
            'bg-[var(--color-bg-soft)] text-[var(--color-slate-title)] border-[var(--color-border-light)]':
              variant === 'default',
            'bg-green-50 text-green-700 border-green-200': variant === 'success',
            'bg-orange-50 text-orange-700 border-orange-200': variant === 'warning',
            'bg-red-50 text-red-700 border-red-200': variant === 'destructive',
          },
          className
        )}
        {...props}
      >
        <div className="flex gap-3">
          <Icon size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{children}</div>
        </div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
