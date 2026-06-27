import * as React from 'react'
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
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CalendarIcon,
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { zhCN } from 'date-fns/locale'
import { format } from 'date-fns'
import 'react-day-picker/dist/style.css'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
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
import { ApproveApi, type ApproveHistoryQueryDTO } from '@/api/approve'
import type { ApproveLogVO } from '@/types/vo'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

const BIZ_TYPE_OPTIONS = [
  { label: '全部类型', value: '_all' },
  { label: '归档审核', value: '1' },
  { label: '归档确认', value: '2' },
  { label: '销毁审批', value: '3' },
  { label: '借阅审批', value: '4' },
]

const ACTION_OPTIONS = [
  { label: '全部动作', value: '_all' },
  { label: '通过', value: 'PASS' },
  { label: '驳回', value: 'REJECT' },
  { label: '退回', value: 'BACK' },
]

const ACTION_STYLE: Record<string, { label: string; className: string }> = {
  PASS: { label: '通过', className: 'bg-emerald-500/15 text-emerald-300' },
  REJECT: { label: '驳回', className: 'bg-red-500/15 text-red-300' },
  BACK: { label: '退回', className: 'bg-blue-500/15 text-blue-300' },
}

const BIZ_TYPE_LABEL: Record<number, string> = {
  1: '归档审核',
  2: '归档确认',
  3: '销毁审批',
  4: '借阅审批',
}

/* ── 日期范围类型 ───────────────────────────────────────────── */
interface DateRange {
  from: Date | undefined
  to?: Date | undefined
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function ApproveHistoryView() {
  const [query, setQuery] = useState<ApproveHistoryQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  /* ── 日期范围状态 ─────────────────────────────────────────── */
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [dateDrawerOpen, setDateDrawerOpen] = useState(false)

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['approve', 'history', query],
    queryFn: () => ApproveApi.history(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 展开/收起 ────────────────────────────────────────────── */
  function toggleRow(logId: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<ApproveLogVO>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('createdAt', {
        header: '审批时间',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span className="text-xs text-slate-body whitespace-nowrap">
              {val ? val.slice(0, 16).replace('T', ' ') : '—'}
            </span>
          )
        },
      }),
      columnHelper.accessor('businessType', {
        header: '业务类型',
        cell: (info) => (
          <span className="text-sm text-slate-title">
            {BIZ_TYPE_LABEL[info.getValue()] || info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('targetArchiveNo', {
        header: '目标档号',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-body truncate max-w-[140px] block">
            {info.getValue() || '—'}
          </span>
        ),
      }),
      columnHelper.accessor('approverName', {
        header: '审批人',
        cell: (info) => (
          <span className="text-sm text-slate-body">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('action', {
        header: '动作',
        cell: (info) => {
          const style = ACTION_STYLE[info.getValue()] ?? {
            label: info.getValue(),
            className: 'bg-[var(--color-bg-soft)] text-slate-body',
          }
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-tag px-2.5 py-0.5 text-xs font-semibold',
                style.className
              )}
            >
              {style.label}
            </span>
          )
        },
      }),
      columnHelper.accessor('opinion', {
        header: '意见摘要',
        cell: (info) => {
          const text = info.getValue() || ''
          return (
            <span className="text-sm text-slate-body max-w-[200px] truncate block">
              {text || '—'}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'expand',
        header: '',
        cell: ({ row }) => {
          const log = row.original
          const isExpanded = expandedRows.has(log.logId)
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => toggleRow(log.logId)}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          )
        },
      }),
    ],
    [expandedRows]
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
    setDateRange(undefined)
  }

  function applyDateRange() {
    setQuery((prev) => ({
      ...prev,
      dateFrom: dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : undefined,
      dateTo: dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : undefined,
      current: 1,
    }))
    setDateDrawerOpen(false)
  }

  function clearDateRange() {
    setDateRange(undefined)
    setQuery((prev) => ({
      ...prev,
      dateFrom: undefined,
      dateTo: undefined,
      current: 1,
    }))
  }

  /* ── 日期范围展示文本 ─────────────────────────────────────── */
  const dateRangeText = useMemo(() => {
    if (!dateRange?.from) return '选择日期范围'
    const fromStr = format(dateRange.from, 'yyyy-MM-dd')
    const toStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''
    return toStr ? `${fromStr} 至 ${toStr}` : `${fromStr} 起`
  }, [dateRange])

  /* ── 筛选表单（复用于电脑端和手机端Drawer）────────────────── */
  const filterForm = (
    <div className="space-y-4 md:flex md:items-center md:gap-2 md:space-y-0">
      <div className="md:w-[130px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">业务类型</label>
        <Select
          value={query.businessType?.toString() ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({
              ...prev,
              businessType: v === '_all' ? undefined : Number(v),
              current: 1,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="业务类型" />
          </SelectTrigger>
          <SelectContent>
            {BIZ_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[110px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">审批动作</label>
        <Select
          value={query.action ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({
              ...prev,
              action: v === '_all' ? undefined : v,
              current: 1,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="审批动作" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[210px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">日期范围</label>
        <button
          type="button"
          onClick={() => setDateDrawerOpen(true)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2 text-sm',
            !dateRange?.from && 'text-[var(--text-faint)]'
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <CalendarIcon size={15} className="shrink-0 opacity-50" />
            <span className="truncate text-[var(--color-slate-title)]">{dateRangeText}</span>
          </span>
          {dateRange?.from && (
            <span
              className="ml-1 shrink-0 text-xs text-[var(--text-faint)] hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); clearDateRange() }}
            >
              清除
            </span>
          )}
        </button>
      </div>

      <div className="md:w-[180px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="档号 / 审批人"
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
          <ClipboardList size={20} className="text-primary-dark" />
          <h2 className="text-xl font-bold text-slate-title">审批历史追溯</h2>
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
        title={<span className="flex items-center gap-2"><ClipboardList size={22} className="text-primary-dark" />审批历史追溯</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="档号 / 审批人"
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
              <EmptyState description="暂无审批历史记录" />
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
                {table.getRowModel().rows.map((row) => {
                  const log = row.original
                  const isExpanded = expandedRows.has(log.logId)
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleRow(log.logId)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && log.opinion && (
                        <tr>
                          <TableCell
                            colSpan={row.getVisibleCells().length}
                            className="bg-[var(--color-bg-soft)]"
                          >
                            <div className="py-2">
                              <span className="mb-1.5 block text-xs font-medium text-[var(--text-faint)]">
                                审批意见
                              </span>
                              <p className="text-sm leading-relaxed text-slate-body">
                                {log.opinion}
                              </p>
                            </div>
                          </TableCell>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 手机端卡片列表 */}
        <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))
            : records.length === 0
              ? <EmptyState description="暂无审批历史记录" />
              : records.map((log) => {
                  const isExpanded = expandedRows.has(log.logId)
                  const actionStyle = ACTION_STYLE[log.action] ?? {
                    label: log.action,
                    className: 'bg-[var(--color-bg-soft)] text-slate-body',
                  }
                  return (
                    <div
                      key={log.logId}
                      className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform"
                    >
                      <div
                        className="flex items-start justify-between gap-2"
                        onClick={() => toggleRow(log.logId)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-title">
                              {BIZ_TYPE_LABEL[log.businessType] || log.businessType}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-tag px-2 py-0.5 text-[10px] font-semibold',
                                actionStyle.className
                              )}
                            >
                              {actionStyle.label}
                            </span>
                          </div>
                          <div className="mb-0.5 font-mono text-[11px] text-[var(--text-faint)] truncate">
                            {log.targetArchiveNo || '—'}
                          </div>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-[var(--text-faint)]" />
                          ) : (
                            <ChevronDown size={16} className="text-[var(--text-faint)]" />
                          )}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-body">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-faint)]">审批人</span>
                          <span>{log.approverName || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-faint)]">审批时间</span>
                          <span>{log.createdAt?.slice(0, 16).replace('T', ' ') || '—'}</span>
                        </div>
                      </div>

                      {isExpanded && log.opinion && (
                        <div className="mt-3 rounded-lg bg-[var(--color-bg-soft)] p-3">
                          <span className="mb-1 block text-xs font-medium text-[var(--text-faint)]">
                            审批意见
                          </span>
                          <p className="text-sm leading-relaxed text-slate-body">
                            {log.opinion}
                          </p>
                        </div>
                      )}
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

      {/* ── 手机端日期范围选择 Drawer（底部弹窗）────────────────── */}
      <Drawer open={dateDrawerOpen} onOpenChange={setDateDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>选择日期范围</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>
            <div className="flex justify-center">
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={zhCN}
                className={cn('border-0 p-3')}
                classNames={{
                  root: 'rdp',
                  months: 'flex flex-col gap-4',
                  month: 'space-y-3',
                  month_caption: 'flex justify-center relative items-center h-8',
                  caption_label: 'text-sm font-medium text-[var(--color-slate-title)]',
                  nav: 'absolute inset-x-0 top-0 flex justify-between px-1',
                  button_previous: cn(
                    'h-7 w-7 inline-flex items-center justify-center rounded-btn border border-[var(--color-border-light)] opacity-70 hover:opacity-100 transition-opacity'
                  ),
                  button_next: cn(
                    'h-7 w-7 inline-flex items-center justify-center rounded-btn border border-[var(--color-border-light)] opacity-70 hover:opacity-100 transition-opacity'
                  ),
                  chevron: 'fill-[var(--color-slate-title)]',
                  month_grid: 'w-full border-collapse',
                  weekdays: 'flex',
                  weekday: 'text-[var(--text-faint)] rounded-md w-9 font-normal text-[0.8rem] text-center',
                  weeks: 'space-y-1',
                  week: 'flex w-full',
                  day: 'text-center text-sm p-0 relative w-9 h-9',
                  day_button: cn(
                    'h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-btn hover:bg-[var(--color-bg-soft)] text-[var(--color-slate-title)] transition-colors'
                  ),
                  selected: 'bg-primary text-white hover:bg-primary hover:text-white',
                  range_start: 'bg-primary text-white hover:bg-primary hover:text-white',
                  range_end: 'bg-primary text-white hover:bg-primary hover:text-white',
                  range_middle: 'bg-primary/20 text-primary-dark',
                  today: 'bg-accent/10 text-accent',
                  outside: 'text-[var(--text-faint)] opacity-50',
                  disabled: 'text-[var(--text-faint)] opacity-50',
                }}
              />
            </div>
            {dateRange?.from && (
              <div className="mt-3 text-center text-sm text-slate-body">
                已选：{format(dateRange.from, 'yyyy-MM-dd')}
                {dateRange.to ? ` 至 ${format(dateRange.to, 'yyyy-MM-dd')}` : ' 起'}
              </div>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={clearDateRange}>
              清除
            </Button>
            <Button onClick={applyDateRange}>
              确定
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
