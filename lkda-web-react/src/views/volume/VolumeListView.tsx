import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Search,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  MoreHorizontal,
  Upload,
  Download,
  Eye,
  Edit3,
  BookOpen,
  LayoutList,
  LayoutGrid,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { VirtualCardList } from '@/components/VirtualCardList'
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import Pagination from '@/components/ui/pagination'
import EmptyState from '@/components/EmptyState'
import StatusTag from '@/components/StatusTag'
import { VolumeApi, type VolumeQueryDTO } from '@/api/volume'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import type { ArchiveVolumeListVO } from '@/types/vo'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { label: '草稿', value: '0' },
  { label: '待审核', value: '1' },
  { label: '待确认', value: '2' },
  { label: '已归档', value: '3' },
]

const STOCK_OPTIONS = [
  { label: '在库', value: '1' },
  { label: '借出', value: '0' },
]

const SECURITY_CLASS: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  internal: 'bg-blue-50 text-blue-700',
  secret: 'bg-yellow-50 text-yellow-700',
  confidential: 'bg-orange-50 text-orange-700',
  topsecret: 'bg-red-50 text-red-700',
}

/* ── 年度选项（2018 - 当前年）────────────────────────────────── */
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: currentYear - 2017 }, (_, i) =>
  String(currentYear - i)
)

/* ── 案卷状态值（含销毁待审批）────────────────────────────────── */
function archiveStatusValue(row: ArchiveVolumeListVO): number {
  if (row.pendingDestroy === 1) return 10
  return row.status
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function VolumeListView() {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const dictStore = useDictStore()
  const isAdmin = authStore.isAdmin

  const [query, setQuery] = useState<VolumeQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  /* ── 字典数据 ─────────────────────────────────────────────── */
  const categoryL1Options = dictStore.getItems('category_l1')
  const categoryL2Options = dictStore.getItems('category_l2')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['volume', 'page', query],
    queryFn: () =>
      VolumeApi.page({
        ...query,
        keyword: query.keyword || undefined,
      }),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<ArchiveVolumeListVO>()

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'seq',
        header: '序号',
        cell: ({ row }) => (
          <span className="text-xs text-slate-400 tabular-nums">
            {((query.current ?? 1) - 1) * PAGE_SIZE + row.index + 1}
          </span>
        ),
      }),
      columnHelper.accessor('archiveNo', {
        header: '档号',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-body">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('volumeTitle', {
        header: '案卷题名',
        cell: (info) => (
          <span className="font-medium text-slate-title max-w-[200px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('year', {
        header: '年度',
        cell: (info) => (
          <span className="whitespace-nowrap">{info.getValue()} 年</span>
        ),
      }),
      columnHelper.accessor('categoryL1Label', {
        header: '一级类目',
        cell: (info) => (
          <span className="whitespace-nowrap">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('securityLevelLabel', {
        header: '密级',
        cell: (info) => {
          const val = info.row.original.securityLevel
          const label = info.getValue() || val || '—'
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                SECURITY_CLASS[val] ?? 'bg-slate-100 text-slate-600'
              )}
            >
              {label}
            </span>
          )
        },
      }),
      columnHelper.accessor('retentionPeriodLabel', {
        header: '保管期限',
        cell: (info) => (
          <span className="whitespace-nowrap">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('status', {
        header: '归档状态',
        cell: (info) => (
          <span className="whitespace-nowrap">
            <StatusTag
              type="archive"
              value={archiveStatusValue(info.row.original)}
            />
          </span>
        ),
      }),
      columnHelper.accessor('inStock', {
        header: '在库',
        cell: (info) => (
          <span className="whitespace-nowrap">
            <StatusTag type="stock" value={info.getValue()} />
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const vol = row.original
          return (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => goDetail(vol)}
                    >
                      <Eye size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看</TooltipContent>
                </Tooltip>

                {vol.status === 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:bg-primary/10"
                        onClick={() => goEdit(vol)}
                      >
                        <Edit3 size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑</TooltipContent>
                  </Tooltip>
                )}

                {vol.status === 3 && vol.inStock === 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600 hover:bg-green-50"
                        onClick={() => goBorrow(vol)}
                      >
                        <BookOpen size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>借阅</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )
        },
      }),
    ],
    [query.current]
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

  function goDetail(vol: ArchiveVolumeListVO) {
    navigate(`/volume/detail/${vol.recordId}?year=${vol.year}`)
  }

  function goEdit(vol: ArchiveVolumeListVO) {
    navigate(`/volume/edit/${vol.recordId}?year=${vol.year}`)
  }

  function goBorrow(vol: ArchiveVolumeListVO) {
    navigate(`/borrow/apply/${encodeURIComponent(vol.archiveNo)}`)
  }

  function goNew() {
    navigate('/volume/edit')
  }

  function goImport() {
    navigate('/volume/import')
  }

  /* ── 筛选表单渲染（复用于电脑端和手机端 Drawer）────────────── */
  const filterForm = (
    <div className="space-y-4 md:flex md:flex-wrap md:items-center md:gap-2 md:space-y-0">
      <div className="md:w-[120px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">年度</label>
        <Select
          value={query.year ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({ ...prev, year: v === '_all' ? undefined : v, current: 1 }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="年度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部年度</SelectItem>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={y}>
                {y} 年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[140px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">一级类目</label>
        <Select
          value={query.categoryL1 ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({
              ...prev,
              categoryL1: v === '_all' ? undefined : v,
              categoryL2: undefined,
              current: 1,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="一级类目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部类目</SelectItem>
            {categoryL1Options.map((item) => (
              <SelectItem key={item.itemValue} value={item.itemValue}>
                {item.itemLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[140px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">二级类目</label>
        <Select
          value={query.categoryL2 ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({ ...prev, categoryL2: v === '_all' ? undefined : v, current: 1 }))
          }
          disabled={!query.categoryL1}
        >
          <SelectTrigger>
            <SelectValue placeholder="二级类目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部类目</SelectItem>
            {categoryL2Options.map((item) => (
              <SelectItem key={item.itemValue} value={item.itemValue}>
                {item.itemLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[120px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">归档状态</label>
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
            <SelectValue placeholder="归档状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部状态</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[105px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">在库状态</label>
        <Select
          value={query.inStock?.toString() ?? '_all'}
          onValueChange={(v) =>
            setQuery((prev) => ({
              ...prev,
              inStock: v === '_all' ? undefined : Number(v),
              current: 1,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="在库状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">全部</SelectItem>
            {STOCK_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:w-[200px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="题名 / 档号 / 主题词"
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
      {/* ── 手机端标题行 ───────────────────────────────────────── */}
      <PageHeader title={<span className="inline-flex items-center gap-2"><BookOpen size={20} className="text-primary-dark" />案卷目录</span>} className="md:hidden" />

      {/* ── 电脑端：标题 + 操作按钮合并为一行 ──────────────────── */}
      <div className="mb-3 hidden md:flex md:items-center md:justify-between">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-title"><BookOpen size={20} className="text-primary-dark" />案卷目录</h2>
        <div className="flex items-center gap-2">
          <Button onClick={goNew}>
            <Plus size={16} />
            新建案卷
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={goImport}>
              <Upload size={16} />
              批量导入
            </Button>
          )}
          <Button variant="outline">
            <Download size={16} />
            导出列表
          </Button>
          <div className="ml-1 flex items-center gap-1">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <LayoutList size={14} />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'primary' : 'outline'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 电脑端检索区（紧凑单行）────────────────────────────── */}
      <div className="mb-3 hidden rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5 md:block">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-0">
            {filterForm}
          </div>
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

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="案卷题名 / 档号 / 主题词"
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

      {/* ── 手机端工具栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <Button onClick={goNew} size="sm">
          <Plus size={16} />
          新建
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal size={16} />
              更多
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2">
            <div className="flex flex-col gap-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={goImport}
                >
                  <Upload size={14} className="mr-2" />
                  批量导入
                </Button>
              )}
              <Button variant="ghost" size="sm" className="justify-start">
                <Download size={14} className="mr-2" />
                导出列表
              </Button>
              <div className="my-1 h-px bg-[var(--color-border-light)]" />
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => setViewMode('table')}
              >
                <LayoutList size={14} className="mr-2" />
                表格视图
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid size={14} className="mr-2" />
                卡片视图
              </Button>
            </div>
          </PopoverContent>
        </Popover>
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
        {(viewMode === 'table') && (
          <div className="hidden md:block overflow-auto">
            {isLoading ? (
              <div className="space-y-3 p-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="py-12">
                <EmptyState description="暂无案卷数据，试试调整检索条件" />
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
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => goDetail(row.original)}
                    >
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
        )}

        {/* 电脑端卡片视图 */}
        {(viewMode === 'card') && (
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-card bg-slate-100" />
                ))
              : records.length === 0
                ? <EmptyState description="暂无案卷数据，试试调整检索条件" />
                : records.map((vol) => (
                    <div
                      key={`${vol.recordId}-${vol.year}`}
                      className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
                      onClick={() => goDetail(vol)}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="mb-1 font-mono text-xs text-slate-400">
                            {vol.archiveNo}
                          </div>
                          <div className="text-sm font-semibold text-slate-title line-clamp-2">
                            {vol.volumeTitle}
                          </div>
                        </div>
                      </div>
                      <div className="mb-3 space-y-1.5 text-sm text-slate-body">
                        <div className="flex justify-between">
                          <span>年度</span>
                          <span>{vol.year} 年</span>
                        </div>
                        <div className="flex justify-between">
                          <span>一级类目</span>
                          <span>{vol.categoryL1Label || vol.categoryL1 || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>密级</span>
                          <span>{vol.securityLevelLabel || vol.securityLevel || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>保管期限</span>
                          <span>{vol.retentionPeriodLabel || vol.retentionPeriod || '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-3">
                        <div className="flex gap-2">
                          <StatusTag type="archive" value={archiveStatusValue(vol)} />
                          <StatusTag type="stock" value={vol.inStock} />
                        </div>
                        {vol.status === 3 && vol.inStock === 1 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-7 px-1 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              goBorrow(vol)
                            }}
                          >
                            <BookOpen size={13} className="mr-0.5" />
                            借阅
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
          </div>
        )}

        {/* 手机端卡片列表（始终卡片，无视图切换）—— 使用虚拟滚动优化长列表性能 */}
        <div
          className="md:hidden p-3 overscroll-contain"
          style={{ height: 'calc(100dvh - 200px)' }}
        >
          <VirtualCardList
            items={records}
            estimateSize={190}
            overscan={4}
            className="h-full"
            loading={isLoading}
            loadingSkeleton={
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-card bg-slate-100" />
                ))}
              </div>
            }
            emptyState={<EmptyState description="暂无案卷数据，试试调整检索条件" />}
            renderItem={(vol, idx) => (
              <div
                className={cn(
                  'rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform',
                  idx < records.length - 1 && 'mb-3'
                )}
                onClick={() => goDetail(vol)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded bg-slate-100 px-1 text-[10px] font-medium tabular-nums text-slate-400">
                        {((query.current ?? 1) - 1) * PAGE_SIZE + idx + 1}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 truncate">
                        {vol.archiveNo}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-title line-clamp-2">
                      {vol.volumeTitle}
                    </div>
                  </div>
                  <StatusTag type="archive" value={archiveStatusValue(vol)} />
                </div>

                <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
                  <div className="flex justify-between">
                    <span className="text-slate-400">年度</span>
                    <span>{vol.year} 年</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">在库</span>
                    <StatusTag type="stock" value={vol.inStock} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">一级类目</span>
                    <span className="truncate text-right">{vol.categoryL1Label || vol.categoryL1 || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">密级</span>
                    <span className="truncate text-right">{vol.securityLevelLabel || vol.securityLevel || '—'}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-slate-400">保管期限</span>
                    <span>{vol.retentionPeriodLabel || vol.retentionPeriod || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      goDetail(vol)
                    }}
                  >
                    <Eye size={13} className="mr-1" />
                    查看
                  </Button>
                  {vol.status === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        goEdit(vol)
                      }}
                    >
                      <Edit3 size={13} className="mr-1" />
                      编辑
                    </Button>
                  )}
                  {vol.status === 3 && vol.inStock === 1 && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        goBorrow(vol)
                      }}
                    >
                      <BookOpen size={13} className="mr-1" />
                      借阅
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
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
    </div>
  )
}
