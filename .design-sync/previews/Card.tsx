import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from 'lkda-web-react'

export function Basic() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>案卷信息</CardTitle>
        <CardDescription>全宗号 01 · 2026 年度</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--color-slate-body)]">
          莱矿档案管理系统案卷级档案卡片，展示标题、描述、内容与操作区。
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">查看详情</Button>
        <Button size="sm" variant="outline">编辑</Button>
      </CardFooter>
    </Card>
  )
}

export function WithStatus() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>地质勘探报告</CardTitle>
          <Badge variant="success">已归档</Badge>
        </div>
        <CardDescription>档号 01.8.01.0101.01.003</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-[var(--color-slate-body)]">保管期限</dt>
          <dd className="text-[var(--color-slate-title)]">永久</dd>
          <dt className="text-[var(--color-slate-body)]">密级</dt>
          <dd className="text-[var(--color-slate-title)]">内部</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
