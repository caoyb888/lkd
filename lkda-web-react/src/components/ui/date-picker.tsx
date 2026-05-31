import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from './input'

export interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className={cn('w-full', className)}>
        <Input type="date" ref={ref} {...props} />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
