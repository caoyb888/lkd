import { cn } from '@/lib/utils'

interface DataTableProps {
  className?: string
}

export default function DataTable({ className }: DataTableProps) {
  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-title">列1</th>
            <th className="px-4 py-3 text-left font-medium text-slate-title">列2</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="px-4 py-3">数据1</td>
            <td className="px-4 py-3">数据2</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
