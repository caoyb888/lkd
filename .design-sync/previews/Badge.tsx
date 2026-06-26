import { Badge } from 'lkda-web-react'

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="default">默认</Badge>
      <Badge variant="primary">主要</Badge>
      <Badge variant="success">成功</Badge>
      <Badge variant="warning">警告</Badge>
      <Badge variant="danger">危险</Badge>
      <Badge variant="outline">边框</Badge>
    </div>
  )
}

export function InContext() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-slate-title)]">
      <span>借阅状态：</span>
      <Badge variant="success">已归还</Badge>
      <Badge variant="warning">即将到期</Badge>
      <Badge variant="danger">已逾期</Badge>
    </div>
  )
}
