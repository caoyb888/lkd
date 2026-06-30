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
  Trash2,
  AlertTriangle,
  FileX,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import ViewModeToggle from '@/components/ViewModeToggle'
import { useViewMode } from '@/hooks/useViewMode'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
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
import { VolumeApi, type VolumeQueryDTO } from '@/api/volume'
import { DestroyApi } from '@/api/destroy'
import type { ArchiveVolumeListVO } from '@/types/vo'
import { toast } from 'sonner'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function DestroyApplyView() {
  const queryClient = useQueryClient()

  const [query, setQuery] = useState<VolumeQueryDTO>({
    status: 3,
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useViewMode('lkda_destroy_apply_view')

  /* ── 确认弹窗状态 ─────────────────────────────────────────── */
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ArchiveVolumeListVO | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [confirmOpinion, setConfirmOpinion] = useState('')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['volume', 'destroy-apply', query],
    queryFn: () => VolumeApi.page(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 销毁申请 Mutation ────────────────────────────────────── */
  const applyMutation = useMutation({
    mutationFn: ({ recordId, year, opinion }: { recordId: number; year: string; opinion?: string }) =>
      DestroyApi.apply(recordId, year, opinion),
    onSuccess: () => {
      toast.success('销毁申请已提交，等待公司领导审批')
      closeConfirm()
      queryClient.invalidateQueries({ queryKey: ['volume', 'destroy-apply'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
      queryClient.invalidateQueries({ queryKey: ['approve', 'history'] })
    },
  })

  function openConfirm(vol: ArchiveVolumeListVO) {
    setConfirmTarget(vol)
    setConfirmInput('')
    setConfirmOpinion('')
    setConfirmOpen(true)
  }

  function closeConfirm() {
    setConfirmOpen(false)
    setConfirmTarget(null)
    setConfirmInput('')
    setConfirmOpinion('')
  }

  function handleApply() {
    if (!confirmTarget) return
    if (confirmInput.trim() !== confirmTarget.archiveNo) {
      toast.error('档号输入不一致，请重新输入')
      return
    }
    applyMutation.mutate({
      recordId: confirmTarget.recordId,
      year: confirmTarget.year,
      opinion: confirmOpinion.trim() || undefined,
    })
  }

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<ArchiveVolumeListVO>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('archiveNo', {
        header: '档号',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-body">{info.getValue()}</span>
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
          const canApply = vol.pendingDestroy !== 1
          return canApply ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-300 hover:bg-red-500/15"
                    onClick={() => openConfirm(vol)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>申请销毁</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <StatusTag type="archive" value={10} />
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
      status: 3,
      current: 1,
      size: PAGE_SIZE,
    })
  }

  /* ── 筛选表单 ─────────────────────────────────────────────── */
  const filterForm = (
    <div className="space-y-4 md:flex md:items-center md:gap-2 md:space-y-0">
      <div className="md:w-[280px]">
        <label className="mb-1.5 block text-sm font-medium text-slate-body md:hidden">关键词</label>
        <Input
          placeholder="档号 / 案卷题名 / 立卷人"
          value={query.keyword ?? ''}
          onChange={(e) =>
            setQuery((prev) => ({ ...prev, keyword: e.target.value, current: 1 }))
          }
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>
    </div>
  )

  /* ── 确认弹窗内容（复用 Dialog + Drawer）────────────────────── */
  const confirmBody = (
    <div className="space-y-4">
      {confirmTarget && (
        <>
          <div className="rounded-card border border-red-500/30 bg-red-500/15 p-4">
            <div className="mb-2 flex items-center gap-2 text-red-300">
              <AlertTriangle size={18} />
              <span className="text-sm font-semibold">高危操作确认</span>
            </div>
            <div className="space-y-1 text-sm text-slate-body">
              <div className="font-mono text-xs text-red-300">{confirmTarget.archiveNo}</div>
              <div className="font-medium text-slate-title">{confirmTarget.volumeTitle}</div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-title">
              请输入档号以确认销毁申请
              <span className="ml-1 text-xs font-normal text-[var(--text-faint)]">（防止误操作）</span>
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={`输入：${confirmTarget.archiveNo}`}
              className={confirmInput && confirmInput !== confirmTarget.archiveNo ? 'border-red-500/40 focus:border-red-500 focus:ring-red-500/30' : ''}
            />
            {confirmInput && confirmInput !== confirmTarget.archiveNo && (
              <p className="mt-1 text-xs text-red-400">档号输入不一致</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-body">
              销毁原因
              <span className="ml-1 text-xs font-normal text-[var(--text-faint)]">（选填）</span>
            </label>
            <textarea
              value={confirmOpinion}
              onChange={(e) => setConfirmOpinion(e.target.value)}
              placeholder="请说明销毁原因..."
              rows={3}
              className="w-full resize-none rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2.5 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </>
      )}
    </div>
  )

  return (
    <div>
      {/* ── 电脑端：标题 + 检索区合并 ──────────────────────────── */}
      <div className="mb-3 hidden md:block">
        <div className="mb-2 flex items-center gap-2">
          <FileX size={20} className="text-red-300" />
          <h2 className="text-xl font-bold text-slate-title">销毁申请</h2>
          <ViewModeToggle value={viewMode} onChange={setViewMode} className="ml-auto" />
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
        title={<span className="flex items-center gap-2"><FileX size={22} className="text-red-300" />销毁申请</span>}
        className="md:hidden"
      />

      {/* ── 手机端检索栏 ───────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 md:hidden">
        <Input
          placeholder="档号 / 案卷题名 / 立卷人"
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
              <EmptyState description="暂无可申请销毁的已归档案卷" />
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
              ? <EmptyState description="暂无可申请销毁的已归档案卷" />
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
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                      {vol.pendingDestroy !== 1 ? (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600"
                          onClick={() => openConfirm(vol)}
                        >
                          <Trash2 size={13} className="mr-1" />
                          申请销毁
                        </Button>
                      ) : (
                        <div className="flex-1 flex justify-center">
                          <StatusTag type="archive" value={10} />
                        </div>
                      )}
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

      {/* ── 电脑端确认 Dialog ──────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={20} />
              确认申请销毁
            </DialogTitle>
            <DialogDescription>
              此操作将提交案卷销毁申请，经公司领导审批通过后将标记为已销毁。请谨慎操作。
            </DialogDescription>
          </DialogHeader>
          {confirmBody}
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              loading={applyMutation.isPending}
              onClick={handleApply}
            >
              <Trash2 size={16} className="mr-1.5" />
              确认申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 手机端确认 Drawer ──────────────────────────────────── */}
      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle size={20} />
              确认申请销毁
            </DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>{confirmBody}</DrawerBody>
          <DrawerFooter className="max-md:flex-row max-md:justify-stretch">
            <Button variant="outline" className="max-md:flex-1" onClick={closeConfirm}>
              取消
            </Button>
            <Button
              className="max-md:flex-1 bg-red-500 hover:bg-red-600"
              loading={applyMutation.isPending}
              onClick={handleApply}
            >
              <Trash2 size={16} className="mr-1.5" />
              确认申请
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
