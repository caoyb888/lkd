import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CheckCircle2,
  RotateCcw,
  Clock,
  UserCheck,
  FileCheck,
} from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

import PageHeader from '@/components/PageHeader'
import ViewModeToggle from '@/components/ViewModeToggle'
import { useViewMode } from '@/hooks/useViewMode'
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
import StatusTag from '@/components/StatusTag'
import type { ApproveQueryDTO, ApproveActionDTO } from '@/api/approve'
import type { ArchiveVolumeListVO } from '@/types/vo'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: currentYear - 2017 }, (_, i) =>
  String(currentYear - i)
)

/* ── 类型 ───────────────────────────────────────────────────── */
interface ApproveQueueViewProps {
  title: string
  pageIcon: React.ReactNode
  queryKeyPrefix: string
  fetchList: (params: ApproveQueryDTO) => Promise<{
    records: ArchiveVolumeListVO[]
    total: number
    current: number
    size: number
    pages: number
  }>
  doApprove: (data: ApproveActionDTO) => Promise<void>
  passLabel: string
  backLabel: string
  emptyDesc: string
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function ApproveQueueView({
  title,
  pageIcon,
  queryKeyPrefix,
  fetchList,
  doApprove,
  passLabel,
  backLabel,
  emptyDesc,
}: ApproveQueueViewProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [query, setQuery] = useState<ApproveQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useViewMode('lkda_approve_queue_view')

  /* ── 选中的案卷（用于Drawer）──────────────────────────────── */
  const [selected, setSelected] = useState<ArchiveVolumeListVO | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [opinion, setOpinion] = useState('')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: [queryKeyPrefix, 'list', query],
    queryFn: () => fetchList(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 审批Mutation ─────────────────────────────────────────── */
  const approveMutation = useMutation({
    mutationFn: doApprove,
    onSuccess: () => {
      toast.success('操作成功')
      setDrawerOpen(false)
      setSelected(null)
      setOpinion('')
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix, 'list'] })
      // 审核通过后会进入待确认队列，确认归档/退回后会影响待审核队列
      queryClient.invalidateQueries({ queryKey: ['approve-review', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['approve-confirm', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['approve', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
    },
  })

  function handlePass() {
    if (!selected) return
    approveMutation.mutate({
      recordId: selected.recordId,
      year: selected.year,
      action: 'PASS',
      opinion: opinion.trim() || undefined,
    })
  }

  function handleBack() {
    if (!selected) return
    if (!opinion.trim()) {
      toast.error('退回时必须填写审批意见')
      return
    }
    approveMutation.mutate({
      recordId: selected.recordId,
      year: selected.year,
      action: 'BACK',
      opinion: opinion.trim(),
    })
  }

  function openDrawer(vol: ArchiveVolumeListVO) {
    setSelected(vol)
    setOpinion('')
    setDrawerOpen(true)
  }

  function goDetail(vol: ArchiveVolumeListVO, e?: React.MouseEvent) {
    e?.stopPropagation()
    navigate(`/volume/detail/${vol.recordId}?year=${vol.year}`)
  }

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<ArchiveVolumeListVO>()

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
        header: '案卷题名',
        cell: (info) => (
          <span className="font-medium text-slate-title max-w-[240px] truncate block">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('year', {
        header: '年度',
        cell: (info) => <span className="whitespace-nowrap">{info.getValue()} 年</span>,
      }),
      columnHelper.accessor('categoryL1Label', {
        header: '一级类目',
        cell: (info) => <span className="whitespace-nowrap">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('compiler', {
        header: '立卷人',
        cell: (info) => <span className="whitespace-nowrap">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('createdAt', {
        header: '提交时间',
        cell: (info) => {
          const val = info.getValue()
          return <span className="whitespace-nowrap">{val ? val.slice(0, 16).replace('T', ' ') : '—'}</span>
        },
      }),
      columnHelper.accessor('status', {
        header: '状态',
        cell: (info) => (
          <span className="whitespace-nowrap">
            <StatusTag type="archive" value={info.getValue()} />
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
                      onClick={(e) => goDetail(vol, e)}
                    >
                      <Eye size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary-dark hover:bg-primary/10"
                      onClick={() => openDrawer(vol)}
                    >
                      <FileCheck size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>审批</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )
        },
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

  /* ── 筛选表单渲染（复用于电脑端和手机端Drawer）────────────── */
  const filterForm = (
    <div className="space-y-4 md:flex md:items-center md:gap-2 md:space-y-0">
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

      <div className="md:w-[240px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="案卷题名 / 档号 / 立卷人"
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
          {pageIcon}
          <h2 className="text-xl font-bold text-slate-title">{title}</h2>
          <ViewModeToggle value={viewMode} onChange={setViewMode} className="ml-auto" />
        </div>
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">{filterForm}</div>
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
        title={<span className="flex items-center gap-2">{pageIcon}{title}</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="案卷题名 / 档号 / 立卷人"
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
        <div className={cn('overflow-auto', viewMode === 'table' ? 'hidden md:block' : 'hidden')}>
          {isLoading ? (
            <div className="space-y-3 p-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-bg-soft)]" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState description={emptyDesc} />
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
        <div className={cn('grid grid-cols-1 gap-3 p-3', viewMode === 'card' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:hidden')}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))
            : records.length === 0
              ? <EmptyState description={emptyDesc} />
              : records.map((vol) => (
                  <div
                    key={`${vol.recordId}-${vol.year}`}
                    className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 font-mono text-[11px] text-[var(--text-faint)] truncate">
                          {vol.archiveNo}
                        </div>
                        <div className="text-sm font-semibold text-slate-title line-clamp-2">
                          {vol.volumeTitle}
                        </div>
                      </div>
                      <StatusTag type="archive" value={vol.status} />
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">年度</span>
                        <span>{vol.year} 年</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">一级类目</span>
                        <span className="truncate text-right">{vol.categoryL1Label || vol.categoryL1 || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">立卷人</span>
                        <span>{vol.compiler || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-faint)]">提交时间</span>
                        <span>{vol.createdAt?.slice(0, 16).replace('T', ' ') || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => goDetail(vol)}
                      >
                        <Eye size={13} className="mr-1" />
                        查看
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openDrawer(vol)}
                      >
                        <FileCheck size={13} className="mr-1" />
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
              {queryKeyPrefix === 'approve-review' ? (
                <Clock size={20} className="text-yellow-300" />
              ) : (
                <UserCheck size={20} className="text-blue-300" />
              )}
              {title}
            </DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>

          <DrawerBody className="space-y-5">
            {selected && (
              <>
                {/* 案卷信息卡片 */}
                <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                  <div className="mb-2 font-mono text-xs text-[var(--text-faint)]">
                    {selected.archiveNo}
                  </div>
                  <div className="mb-3 text-sm font-semibold text-slate-title">
                    {selected.volumeTitle}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-body">
                    <div>
                      <span className="text-[var(--text-faint)]">年度：</span>
                      {selected.year} 年
                    </div>
                    <div>
                      <span className="text-[var(--text-faint)]">类目：</span>
                      {selected.categoryL1Label || selected.categoryL1 || '—'}
                    </div>
                    <div>
                      <span className="text-[var(--text-faint)]">立卷人：</span>
                      {selected.compiler || '—'}
                    </div>
                    <div>
                      <span className="text-[var(--text-faint)]">密级：</span>
                      {selected.securityLevelLabel || selected.securityLevel || '—'}
                    </div>
                  </div>
                </div>

                {/* 审批意见 */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-title">
                    审批意见
                    <span className="ml-1 text-xs font-normal text-[var(--text-faint)]">（退回时必填）</span>
                  </label>
                  <textarea
                    value={opinion}
                    onChange={(e) => setOpinion(e.target.value)}
                    placeholder="请填写审批意见..."
                    rows={4}
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
              onClick={handleBack}
              disabled={approveMutation.isPending}
            >
              <RotateCcw size={16} className="mr-1.5" />
              {backLabel}
            </Button>
            <Button
              className="max-md:flex-1"
              loading={approveMutation.isPending}
              onClick={handlePass}
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              {passLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
