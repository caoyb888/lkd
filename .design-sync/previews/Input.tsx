import { Input } from 'lkda-web-react'

export function Default() {
  return (
    <div className="w-72 space-y-3">
      <Input placeholder="请输入案卷标题" />
      <Input defaultValue="地质勘探报告（2026）" />
    </div>
  )
}

export function WithLabel() {
  return (
    <div className="w-72 space-y-1.5">
      <label className="text-sm font-medium text-[var(--color-slate-title)]">
        立卷人
      </label>
      <Input placeholder="例如：张三" />
      <p className="text-xs text-[var(--color-slate-body)]">填写本案卷的立卷负责人姓名。</p>
    </div>
  )
}

export function Disabled() {
  return (
    <div className="w-72">
      <Input placeholder="只读字段" disabled />
    </div>
  )
}
