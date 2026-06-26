import { DatePicker } from 'lkda-web-react'

export function WithValue() {
  return (
    <div className="w-56">
      <DatePicker value={new Date('2026-06-26')} />
    </div>
  )
}

export function Placeholder() {
  return (
    <div className="w-56">
      <DatePicker placeholder="选择归档日期" />
    </div>
  )
}
