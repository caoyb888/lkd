import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from 'lkda-web-react'

function YearSelect(props: { defaultValue?: string; placeholder?: string }) {
  return (
    <Select defaultValue={props.defaultValue}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder={props.placeholder ?? '请选择年度'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="2026">2026 年度</SelectItem>
        <SelectItem value="2025">2025 年度</SelectItem>
        <SelectItem value="2024">2024 年度</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function Placeholder() {
  return <YearSelect />
}

export function WithValue() {
  return <YearSelect defaultValue="2026" />
}
