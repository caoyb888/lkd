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
  PenSquare,
  CheckCircle2,
  XCircle,
  User,
  Building,
  Phone,
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
import type { BorrowVO } from '@/types/vo'
import { cn } from '@/lib/utils'
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
export default function BorrowApproveView() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState<BorrowQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)

  /* ── 审批Drawer状态 ───────────────────────────────────────── */
  const [selected, setSelected] = useState<BorrowVO | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [opinion, setOpinion] = useState('')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['borrow', 'pending', query],
    queryFn: () => BorrowApi.pendingList(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 通过Mutation ─────────────────────────────────────────── */
  const passMutation = useMutation({
    mutationFn: ({ borrowId, opinion }: { borrowId: number; opinion?: string }) =>
      BorrowApi.approve(borrowId, undefined, opinion),
    onSuccess: () => {
      toast.success('审批已通过')
      setDrawerOpen(false)
      setSelected(null)
      setOpinion('')
      queryClient.invalidateQueries({ queryKey: ['borrow', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
    },
  })

  /* ── 驳回Mutation ─────────────────────────────────────────── */
  const rejectMutation = useMutation({
    mutationFn: ({ borrowId, opinion }: { borrowId: number; opinion: string }) =>
      BorrowApi.reject(borrowId, opinion),
    onSuccess: () => {
      toast.success('审批已驳回')
      setDrawerOpen(false)
      setSelected(null)
      setOpinion('')
      queryClient.invalidateQueries({ queryKey: ['borrow', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['borrow', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
    },
  })

  function handlePass() {
    if (!selected) return
    passMutation.mutate({
      borrowId: selected.borrowId,
      opinion: opinion.trim() || undefined,
    })
  }

  function handleReject() {
    if (!selected) return
    if (!opinion.trim()) {
      toast.error('驳回时必须填写审批意见')
      return
    }
    rejectMutation.mutate({
      borrowId: selected.borrowId,
      opinion: opinion.trim(),
    })
  }

  function openDrawer(borrow: BorrowVO) {
    setSelected(borrow)
    setOpinion('')
    setDrawerOpen(true)
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
          <span className="font-medium text-slate-title max-w-[180px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('borrowerName', {
        header: '申请人',
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
      columnHelper.accessor('createdAt', {
        header: '申请时间',
        cell: (info) => {
          const val = info.getValue()
          return <span className="whitespace-nowrap">{val ? val.slice(0, 16).replace('T', ' ') : '—'}</span>
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary-dark hover:bg-primary/10"
                  onClick={() => openDrawer(row.original)}
                >
                  <PenSquare size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>审批</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      }),
    ],
    []
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
          placeholder="档号 / 档案名称 / 申请人"
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
          <PenSquare size={20} className="text-primary-dark" />
          <h2 className="text-xl font-bold text-slate-title">借阅审批</h2>
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
        title={<span className="flex items-center gap-2"><PenSquare size={22} className="text-primary-dark" />借阅审批</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="档号 / 档案名称 / 申请人"
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
                <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-bg-soft)]" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState description="暂无待审批的借阅申请" />
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
                <div key={i} className="h-44 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))
            : records.length === 0
              ? <EmptyState description="暂无待审批的借阅申请" />
              : records.map((borrow) => (
                  <div
                    key={borrow.borrowId}
                    className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 font-mono text-[11px] text-[var(--text-faint)] truncate">
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
                        <span className="text-[var(--text-faint)]">申请人</span>
                        <span>{borrow.borrowerName || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">部门</span>
                        <span className="truncate text-right">{borrow.borrowerDept || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">申请份数</span>
                        <span>{borrow.applyCount} 份</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">申请时间</span>
                        <span>{borrow.createdAt?.slice(0, 16).replace('T', ' ') || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openDrawer(borrow)}
                      >
                        <PenSquare size={13} className="mr-1" />
                        审批
                      </Button>
                    </div>
                  </div>
                ))}
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

      {/* ── 审批 Drawer ─────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <PenSquare size={20} className="text-primary-dark" />
              借阅审批
            </DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>

          <DrawerBody className="space-y-5">
            {selected && (
              <>
                {/* 申请人信息 */}
                <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-title">申请人信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-body">
                      <User size={14} className="text-[var(--text-faint)]" />
                      <span>{selected.borrowerName || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-body">
                      <Building size={14} className="text-[var(--text-faint)]" />
                      <span>{selected.borrowerDept || '—'}</span>
                    </div>
                    {selected.borrowerPhone && (
                      <div className="flex items-center gap-2 text-slate-body">
                        <Phone size={14} className="text-[var(--text-faint)]" />
                        <span>{selected.borrowerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 档案信息 */}
                <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-title">档案信息</h4>
                  <div className="mb-2 font-mono text-xs font-semibold text-primary-dark">
                    {selected.archiveNo}
                  </div>
                  <div className="mb-3 text-sm font-medium text-slate-title">
                    {selected.volumeTitle}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-body">
                    <div>申请份数：{selected.applyCount} 份</div>
                    <div>计划归还：{selected.planReturnDate?.slice(0, 10) || '—'}</div>
                  </div>
                </div>

                {/* 借阅原因 */}
                {selected.reason && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-title">借阅原因</h4>
                    <p className="rounded-lg bg-[var(--color-bg-soft)] p-3 text-sm leading-relaxed text-slate-body">
                      {selected.reason}
                    </p>
                  </div>
                )}

                {/* 审批意见 */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-title">
                    审批意见
                    <span className="ml-1 text-xs font-normal text-[var(--text-faint)]">（驳回时必填）</span>
                  </label>
                  <textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    placeholder="请填写审批意见..."
                    rows={3}
                    className={cn(
                      'w-full resize-none rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2.5 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
                    )}
                  />
                </div>
              </>
            )}
          </DrawerBody>

          <DrawerFooter className="max-md:flex-row max-md:justify-stretch">
            <Button
              variant="outline"
              className="max-md:flex-1 text-slate-body"
              onClick={handleReject}
              disabled={passMutation.isPending || rejectMutation.isPending}
            >
              <XCircle size={16} className="mr-1.5" />
              驳回
            </Button>
            <Button
              className="max-md:flex-1"
              loading={passMutation.isPending || rejectMutation.isPending}
              onClick={handlePass}
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              批准
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
