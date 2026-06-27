import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  BookOpen,
  Clock,
  FileCheck,
  AlertTriangle,
  X,
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

/* ── 借阅状态视觉样式（手机端大字号用）──────────────────────── */
function getBorrowVisual(
  status: number,
  remainingDays: number | null
): {
  label: string
  subLabel: string
  className: string
  icon: React.ReactNode
  accent: boolean
} {
  if (status === 0) {
    return {
      label: '待审批',
      subLabel: '等待管理员审批',
      className: 'bg-[var(--color-bg-soft)] text-slate-body',
      icon: <Clock size={14} />,
      accent: false,
    }
  }
  if (status === 1) {
    const days = remainingDays ?? 999
    if (days <= 0) {
      return {
        label: '已逾期',
        subLabel: `逾期 ${Math.abs(days)} 天`,
        className: 'bg-red-500 text-white',
        icon: <AlertTriangle size={16} />,
        accent: true,
      }
    }
    if (days <= 3) {
      return {
        label: '即将到期',
        subLabel: `剩余 ${days} 天`,
        className: 'bg-accent text-white',
        icon: <Clock size={14} />,
        accent: true,
      }
    }
    return {
      label: '已借出',
      subLabel: `剩余 ${days} 天`,
      className: 'bg-primary text-white',
      icon: <BookOpen size={14} />,
      accent: false,
    }
  }
  if (status === 2) {
    return {
      label: '已驳回',
      subLabel: '申请未被批准',
      className: 'bg-[var(--color-bg-soft)] text-slate-body line-through',
      icon: <X size={14} />,
      accent: false,
    }
  }
  if (status === 3) {
    return {
      label: '已归还',
      subLabel: '借阅已结束',
      className: 'bg-emerald-500 text-white',
      icon: <FileCheck size={14} />,
      accent: false,
    }
  }
  if (status === 4) {
    return {
      label: '已逾期',
      subLabel: '请尽快归还',
      className: 'bg-red-500 text-white',
      icon: <AlertTriangle size={16} />,
      accent: true,
    }
  }
  return {
    label: String(status),
    subLabel: '',
    className: 'bg-[var(--color-bg-soft)] text-slate-body',
    icon: null,
    accent: false,
  }
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function BorrowMyView() {
  const [query, setQuery] = useState<BorrowQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<BorrowVO | null>(null)

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['borrow', 'my', query],
    queryFn: () => BorrowApi.myList(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 打开详情 ─────────────────────────────────────────────── */
  function openDetail(borrow: BorrowVO) {
    setSelected(borrow)
    setDetailOpen(true)
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
          <span className="font-medium text-slate-title max-w-[200px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('applyCount', {
        header: '申请份数',
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
                  className="h-7 w-7 text-primary hover:bg-primary/10"
                  onClick={() => openDetail(row.original)}
                >
                  <Eye size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>详情</TooltipContent>
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

  /* ── 事件处理 ─────────────────────────────────────────────── */
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

      <div className="md:w-[220px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="档号 / 档案名称"
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
          <BookOpen size={20} className="text-primary-dark" />
          <h2 className="text-xl font-bold text-slate-title">我的借阅</h2>
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
        title={<span className="flex items-center gap-2"><BookOpen size={22} className="text-primary-dark" />我的借阅</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="档号 / 档案名称"
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
              <EmptyState description="暂无借阅记录" />
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
                <div key={i} className="h-48 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))
            : records.length === 0
              ? <EmptyState description="暂无借阅记录" />
              : records.map((borrow) => {
                  const visual = getBorrowVisual(
                    borrow.status,
                    borrow.remainingDays
                  )
                  return (
                    <div
                      key={borrow.borrowId}
                      className={cn(
                        'rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform',
                        visual.accent && 'ring-1 ring-red-500/40'
                      )}
                    >
                      {/* 状态横幅 */}
                      <div
                        className={cn(
                          'mb-3 flex items-center justify-between rounded-lg px-3 py-2.5',
                          visual.className
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {visual.icon}
                          <span className="text-sm font-semibold">{visual.label}</span>
                        </div>
                        <span className="text-xs opacity-90">{visual.subLabel}</span>
                      </div>

                      {/* 档案信息 */}
                      <div className="mb-3 space-y-1">
                        <div className="font-mono text-[11px] text-[var(--text-faint)] truncate">
                          {borrow.archiveNo}
                        </div>
                        <div className="text-sm font-semibold text-slate-title line-clamp-2">
                          {borrow.volumeTitle}
                        </div>
                      </div>

                      {/* 明细 */}
                      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-faint)]">申请份数</span>
                          <span>{borrow.applyCount} 份</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-faint)]">计划归还</span>
                          <span>{borrow.planReturnDate?.slice(0, 10) || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-faint)]">申请时间</span>
                          <span>{borrow.createdAt?.slice(0, 16).replace('T', ' ') || '—'}</span>
                        </div>
                      </div>

                      {/* 操作 */}
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
                {/* 状态横幅 */}
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5',
                    getBorrowVisual(selected.status, selected.remainingDays).className
                  )}
                >
                  <span className="text-sm font-semibold">
                    {getBorrowVisual(selected.status, selected.remainingDays).label}
                  </span>
                  <span className="text-xs opacity-90">
                    {getBorrowVisual(selected.status, selected.remainingDays).subLabel}
                  </span>
                </div>

                {/* 档案信息 */}
                <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                  <div className="mb-2 font-mono text-xs font-semibold text-primary-dark">
                    {selected.archiveNo}
                  </div>
                  <div className="text-sm font-medium text-slate-title">
                    {selected.volumeTitle}
                  </div>
                </div>

                {/* 申请信息 */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-faint)]">申请份数</span>
                    <span className="text-slate-title">{selected.applyCount} 份</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-faint)]">申请时间</span>
                    <span className="text-slate-title">
                      {selected.createdAt?.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-faint)]">计划归还</span>
                    <span className="text-slate-title">
                      {selected.planReturnDate?.slice(0, 10) || '—'}
                    </span>
                  </div>
                  {selected.actualReturnDate && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-faint)]">实际归还</span>
                      <span className="text-slate-title">
                        {selected.actualReturnDate.slice(0, 10)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 借阅原因 */}
                {selected.reason && (
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-[var(--text-faint)]">
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
        </DrawerContent>
      </Drawer>
    </div>
  )
}
