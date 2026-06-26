import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
} from 'lkda-web-react'

export function Open() {
  return (
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">筛选条件</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-slate-title)]">按状态筛选</p>
          <p className="text-sm text-[var(--color-slate-body)]">
            选择要查看的档案状态，支持草稿、待审核、已归档等。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
