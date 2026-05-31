import * as React from 'react'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'
import { Button } from './button'

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value = 0, min, max, step = 1, onChange, disabled, ...props }, ref) => {
    const handleDec = () => {
      const next = value - step
      if (min !== undefined && next < min) return
      onChange?.(next)
    }

    const handleInc = () => {
      const next = value + step
      if (max !== undefined && next > max) return
      onChange?.(next)
    }

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? 0 : Number(e.target.value)
      if (Number.isNaN(v)) return
      let clamped = v
      if (min !== undefined) clamped = Math.max(min, clamped)
      if (max !== undefined) clamped = Math.min(max, clamped)
      onChange?.(clamped)
    }

    return (
      <div className={cn('inline-flex items-center gap-1', className)}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleDec}
          disabled={disabled || (min !== undefined && value <= min)}
        >
          <Minus size={14} />
        </Button>
        <input
          type="number"
          ref={ref}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={handleInput}
          className={cn(
            'flex h-10 w-20 text-center rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-2 py-2 text-sm text-[var(--color-slate-title)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            className
          )}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleInc}
          disabled={disabled || (max !== undefined && value >= max)}
        >
          <Plus size={14} />
        </Button>
      </div>
    )
  }
)
NumberInput.displayName = 'NumberInput'

export { NumberInput }
