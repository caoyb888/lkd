import { Button } from 'lkda-web-react'

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">主要按钮</Button>
      <Button variant="outline">描边按钮</Button>
      <Button variant="ghost">幽灵按钮</Button>
      <Button variant="danger">危险按钮</Button>
      <Button variant="link">链接按钮</Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">小号 Small</Button>
      <Button size="md">中号 Medium</Button>
      <Button size="lg">大号 Large</Button>
    </div>
  )
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>正常</Button>
      <Button loading>提交中</Button>
      <Button disabled>已禁用</Button>
      <Button variant="outline" disabled>禁用描边</Button>
    </div>
  )
}
