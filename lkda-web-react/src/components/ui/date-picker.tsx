import * as React from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { CalendarIcon } from 'lucide-react'

export interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder = '选择日期', disabled, className }, ref) => {
    const [open, setOpen] = React.useState(false)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-10',
              !value && 'text-slate-400',
              className
            )}
          >
            <CalendarIcon size={16} className="mr-2 opacity-50" />
            {value ? format(value, 'yyyy-MM-dd', { locale: zhCN }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date)
              setOpen(false)
            }}
            locale={zhCN}
            className={cn('border-0 p-3')}
            classNames={{
              root: 'rdp',
              months: 'flex flex-col sm:flex-row gap-4',
              month: 'space-y-3',
              month_caption: 'flex justify-center relative items-center h-8',
              caption_label: 'text-sm font-medium text-[var(--color-slate-title)]',
              nav: 'absolute inset-x-0 top-0 flex justify-between px-1',
              button_previous: cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-btn border border-[var(--color-border-light)] opacity-70 hover:opacity-100 transition-opacity'
              ),
              button_next: cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-btn border border-[var(--color-border-light)] opacity-70 hover:opacity-100 transition-opacity'
              ),
              chevron: 'fill-[var(--color-slate-title)]',
              month_grid: 'w-full border-collapse',
              weekdays: 'flex',
              weekday: 'text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center',
              weeks: 'space-y-1',
              week: 'flex w-full',
              day: 'text-center text-sm p-0 relative w-9 h-9',
              day_button: cn(
                'h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-btn hover:bg-[var(--color-bg-soft)] text-[var(--color-slate-title)] transition-colors'
              ),
              selected: 'bg-primary text-white hover:bg-primary hover:text-white',
              today: 'bg-accent/10 text-accent',
              outside: 'text-slate-400 opacity-50',
              disabled: 'text-slate-400 opacity-50',
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
