import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from 'lkda-web-react'

export function Basic() {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-card border border-[var(--color-border-light)]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>档号</TableHead>
            <TableHead>案卷标题</TableHead>
            <TableHead>年度</TableHead>
            <TableHead>状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>01.8.01.0101.01.001</TableCell>
            <TableCell>地质勘探报告</TableCell>
            <TableCell>2026</TableCell>
            <TableCell><Badge variant="success">已归档</Badge></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>01.8.01.0101.01.002</TableCell>
            <TableCell>安全生产台账</TableCell>
            <TableCell>2026</TableCell>
            <TableCell><Badge variant="warning">待审核</Badge></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>01.8.01.0101.01.003</TableCell>
            <TableCell>设备检修记录</TableCell>
            <TableCell>2025</TableCell>
            <TableCell><Badge variant="default">草稿</Badge></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
