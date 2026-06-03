import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  List,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import Pagination from '@/components/ui/pagination'
import EmptyState from '@/components/EmptyState'
import StatusTag from '@/components/StatusTag'
import { BorrowApi, type BorrowQueryDTO } from '@/api/borrow'
import { useAuthStore } from '@/stores/authStore'
import type { BorrowVO } from '@/types/vo'
// import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { label: '全部状态', value: '_all' },
  { label: '待审批', value: '0' },
  { label: '已借出', value: '1' },
  { label: '已驳回', value: '2' },
  { label: '已归还', value: '3' },
  { label: '逾期', value: '4' },
]

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function BorrowHistoryView() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const isAdmin = authStore.isAdmin
  const isLeader = authStore.isLeader

  const [query, setQuery] = useState<BorrowQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)

  /* ── 详情Drawer ───────────────────────────────────────────── */
  const [selected, setSelected] = useState<BorrowVO | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  /* ── 归还确认Dialog ───────────────────────────────────────── */
  const [returnTarget, setReturnTarget] = useState<BorrowVO | null>(null)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['borrow', 'history', query],
    queryFn: () => {
      // 领导看全部历史，管理员看部门历史
      if (isLeader) {
        return BorrowApi.allHistory(query)
      }
      return BorrowApi.deptHistory(query)
    },
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 归还Mutation ─────────────────────────────────────────── */
  const returnMutation = useMutation({
    mutationFn: (borrowId: number) => BorrowApi.return(borrowId),
    onSuccess: () => {
      toast.success('登记归还成功')
      setReturnDialogOpen(false)
      setReturnTarget(null)
      queryClient.invalidateQueries({ queryKey: ['borrow', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
    },
  })

  function openDetail(borrow: BorrowVO) {
    setSelected(borrow)
    setDetailOpen(true)
  }

  function openReturnDialog(borrow: BorrowVO) {
    setReturnTarget(borrow)
    setReturnDialogOpen(true)
  }

  function handleReturn() {
    if (!returnTarget) return
    returnMutation.mutate(returnTarget.borrowId)
  }

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<BorrowVO>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('archiveNo', {
        header: '档号',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-body">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('volumeTitle', {
        header: '档案名称',
        cell: (info) => (
          <span className="font-medium text-slate-title max-w-[160px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('borrowerName', {
        header: '借阅人',
        cell: (info) => (
          <span className="whitespace-nowrap text-sm text-slate-body">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('borrowerDept', {
        header: '部门',
        cell: (info) => (
          <span className="text-sm text-slate-body">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('applyCount', {
        header: '份数',
        cell: (info) => <span className="whitespace-nowrap">{info.getValue()} 份</span>,
      }),
      columnHelper.accessor('status', {
        header: '状态',
        cell: (info) => (
          <span className="whitespace-nowrap">
            <StatusTag
              type="borrow"
              value={info.getValue()}
              remainDays={info.row.original.remainingDays ?? undefined}
            />
          </span>
        ),
      }),
      columnHelper.accessor('planReturnDate', {
        header: '计划归还',
        cell: (info) => {
          const val = info.getValue()
          return <span className="whitespace-nowrap">{val ? val.slice(0, 10) : '—'}</span>
        },
      }),
      columnHelper.accessor('actualReturnDate', {
        header: '实际归还',
        cell: (info) => {
          const val = info.getValue()
          return <span className="whitespace-nowrap">{val ? val.slice(0, 10) : '—'}</span>
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const borrow = row.original
          const canReturn = isAdmin && borrow.status === 1
          return (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => openDetail(borrow)}
                    >
                      <Eye size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>详情</TooltipContent>
                </Tooltip>
                {canReturn && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => openReturnDialog(borrow)}
                      >
                        <RotateCcw size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>归还</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [isAdmin]
  )

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  /* ── 筛选事件 ─────────────────────────────────────────────── */
  function handleSearch() {
    setQuery((prev) => ({ ...prev, current: 1 }))
  }

  function handleReset() {
    setQuery({
      current: 1,
      size: PAGE_SIZE,
    })
  }

  /* ── 筛选表单 ─────────────────────────────────────────────── */
  const filterForm = (
    <div className="space-y-4 md:flex md:items-center md:gap-2 md:space-y-0">
      <div className="md:w-[120px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">借阅状态</label>
        <Select
          value={query.status?.toString() ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({
              ...prev,
              status: v === '_all' ? undefined : Number(v),
              current: 1,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="借阅状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[240px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="档号 / 档案名称 / 借阅人"
          value={query.keyword ?? ''}
          onChange={(e) =>
            setQuery((prev) => ({ ...prev, keyword: e.target.value, current: 1 }))
          }
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>
    </div>
  )

  return (
    <div>
      {/* ── 电脑端：标题 + 检索区合并 ──────────────────────────── */}
      <div className="mb-3 hidden md:block">
        <div className="mb-2 flex items-center gap-2">
          <List size={20} className="text-primary-dark" />
          <h2 className="text-xl font-bold text-slate-title">借阅历史</h2>
        </div>
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">{filterForm}</div>
            <div className="flex shrink-0 gap-2">
              <Button onClick={handleSearch}>
                <Search size={16} />
                检索
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw size={16} />
                重置
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 手机端标题 ─────────────────────────────────────────── */}
      <PageHeader
        title={<span className="flex items-center gap-2"><List size={22} className="text-primary-dark" />借阅历史</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="档号 / 档案名称 / 借阅人"
          value={query.keyword ?? ''}
          onChange={(e) =>
            setQuery((prev) => ({ ...prev, keyword: e.target.value, current: 1 }))
          }
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button variant="outline" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={16} />
          筛选
        </Button>
      </div>

      {/* ── 内容区 ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)]">
        {/* 统计栏 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-5 py-3">
          <span className="text-sm text-slate-body">
            共 <strong className="text-primary-dark">{pageData?.total ?? 0}</strong> 条记录
          </span>
        </div>

        {/* 电脑端表格视图 */}
        <div className="hidden md:block overflow-auto">
          {isLoading ? (
            <div className="space-y-3 p-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState description="暂无借阅历史记录" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </tr>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 手机端卡片列表 */}
        <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-card bg-slate-100" />
              ))
            : records.length === 0
              ? <EmptyState description="暂无借阅历史记录" />
              : records.map((borrow) => {
                  const canReturn = isAdmin && borrow.status === 1
                  return (
                    <div
                      key={borrow.borrowId}
                      className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 font-mono text-[11px] text-slate-400 truncate">
                            {borrow.archiveNo}
                          </div>
                          <div className="text-sm font-semibold text-slate-title line-clamp-2">
                            {borrow.volumeTitle}
                          </div>
                        </div>
                        <StatusTag
                          type="borrow"
                          value={borrow.status}
                          remainDays={borrow.remainingDays ?? undefined}
                        />
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
                        <div className="flex justify-between">
                          <span className="text-slate-400">借阅人</span>
                          <span>{borrow.borrowerName || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">部门</span>
                          <span className="truncate text-right">{borrow.borrowerDept || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">份数</span>
                          <span>{borrow.applyCount} 份</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">计划归还</span>
                          <span>{borrow.planReturnDate?.slice(0, 10) || '—'}</span>
                        </div>
                        {borrow.actualReturnDate && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-400">实际归还</span>
                            <span>{borrow.actualReturnDate.slice(0, 10)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => openDetail(borrow)}
                        >
                          <Eye size={13} className="mr-1" />
                          详情
                        </Button>
                        {canReturn && (
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                            onClick={() => openReturnDialog(borrow)}
                          >
                            <RotateCcw size={13} className="mr-1" />
                            归还
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="border-t border-[var(--color-border-light)] px-5 py-4">
            <Pagination
              current={query.current ?? 1}
              total={totalPages}
              onChange={(p) => setQuery((prev) => ({ ...prev, current: p }))}
            />
          </div>
        )}
      </div>

      {/* ── 手机端筛选 Drawer ──────────────────────────────────── */}
      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>筛选条件</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>{filterForm}</DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw size={16} className="mr-1.5" />
              重置
            </Button>
            <Button
              onClick={() => {
                handleSearch()
                setFilterOpen(false)
              }}
            >
              <Search size={16} className="mr-1.5" />
              检索
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── 详情 Drawer ─────────────────────────────────────────── */}
      <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>借阅详情</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody className="space-y-4">
            {selected && (
              <>
                <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                  <div className="mb-2 font-mono text-xs font-semibold text-primary-dark">
                    {selected.archiveNo}
                  </div>
                  <div className="text-sm font-medium text-slate-title">
                    {selected.volumeTitle}
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">借阅人</span>
                    <span className="text-slate-title">{selected.borrowerName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">部门</span>
                    <span className="text-slate-title">{selected.borrowerDept || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">申请份数</span>
                    <span className="text-slate-title">{selected.applyCount} 份</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">申请时间</span>
                    <span className="text-slate-title">
                      {selected.createdAt?.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">计划归还</span>
                    <span className="text-slate-title">
                      {selected.planReturnDate?.slice(0, 10) || '—'}
                    </span>
                  </div>
                  {selected.actualReturnDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">实际归还</span>
                      <span className="text-slate-title">
                        {selected.actualReturnDate.slice(0, 10)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">状态</span>
                    <StatusTag
                      type="borrow"
                      value={selected.status}
                      remainDays={selected.remainingDays ?? undefined}
                    />
                  </div>
                </div>

                {selected.reason && (
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-slate-400">
                      借阅原因
                    </span>
                    <p className="rounded-lg bg-[var(--color-bg-soft)] p-3 text-sm leading-relaxed text-slate-body">
                      {selected.reason}
                    </p>
                  </div>
                )}
              </>
            )}
          </DrawerBody>
          {selected && isAdmin && selected.status === 1 && (
            <DrawerFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDetailOpen(false)
                  openReturnDialog(selected)
                }}
              >
                <RotateCcw size={16} className="mr-1.5" />
                登记归还
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>

      {/* ── 归还确认 Dialog ────────────────────────────────────── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-accent" />
              确认登记归还
            </DialogTitle>
            <DialogDescription>
              确认登记归还后，该档案的在库状态将恢复为"在库"，借阅记录状态将变为"已归还"。此操作不可撤销，请确认实物已归还。
            </DialogDescription>
          </DialogHeader>

          {returnTarget && (
            <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
              <div className="mb-1 font-mono text-xs text-primary-dark">
                {returnTarget.archiveNo}
              </div>
              <div className="text-sm font-medium text-slate-title">
                {returnTarget.volumeTitle}
              </div>
              <div className="mt-2 text-xs text-slate-body">
                借阅人：{returnTarget.borrowerName} · {returnTarget.applyCount} 份
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              loading={returnMutation.isPending}
              onClick={handleReturn}
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              确认归还
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
