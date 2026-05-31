import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  emptyText?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  emptyText = '暂无数据',
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className={cn('w-full', className)}>
      <div className="hidden md:block rounded-card border border-[var(--color-border-light)] overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card space-y-2"
            >
              {row.getVisibleCells().map((cell) => {
                const header = table
                  .getFlatHeaders()
                  .find((h) => h.id === cell.column.id)
                const label = header?.column.columnDef.header as string
                return (
                  <div key={cell.id} className="flex justify-between text-sm">
                    <span className="text-slate-body font-medium">{label}</span>
                    <span className="text-[var(--color-slate-title)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                )
              })}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-body">{emptyText}</div>
        )}
      </div>
    </div>
  )
}
