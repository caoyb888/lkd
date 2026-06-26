import { DataTable, Badge } from 'lkda-web-react'

const columns = [
  { accessorKey: 'archiveNo', header: '档号' },
  { accessorKey: 'title', header: '案卷标题' },
  { accessorKey: 'year', header: '年度' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }: { row: { original: { status: string } } }) => (
      <Badge variant={row.original.status === '已归档' ? 'success' : 'warning'}>
        {row.original.status}
      </Badge>
    ),
  },
]

const data = [
  { archiveNo: '01.8.01.0101.01.001', title: '地质勘探报告', year: 2026, status: '已归档' },
  { archiveNo: '01.8.01.0101.01.002', title: '安全生产台账', year: 2026, status: '待审核' },
  { archiveNo: '01.8.01.0101.01.003', title: '设备检修记录', year: 2025, status: '待审核' },
]

export function Basic() {
  return (
    <div className="w-full max-w-2xl">
      <DataTable columns={columns} data={data} />
    </div>
  )
}
