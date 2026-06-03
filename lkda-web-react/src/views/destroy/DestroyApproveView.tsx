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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Gavel,
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
import { DestroyApi, type DestroyQueryDTO } from '@/api/destroy'
import type { ArchiveVolumeListVO } from '@/types/vo'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── 常量 ───────────────────────────────────────────────────── */
const PAGE_SIZE = 20

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function DestroyApproveView() {
  const queryClient = useQueryClient()

  const [query, setQuery] = useState<DestroyQueryDTO>({
    current: 1,
    size: PAGE_SIZE,
  })
  const [filterOpen, setFilterOpen] = useState(false)

  /* ── 审批状态 ─────────────────────────────────────────────── */
  const [selected, setSelected] = useState<ArchiveVolumeListVO | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [opinion, setOpinion] = useState('')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['destroy', 'pending', query],
    queryFn: () => DestroyApi.pendingPage(query),
  })

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / PAGE_SIZE)

  /* ── 审批 Mutations ───────────────────────────────────────── */
  const approveMutation = useMutation({
    mutationFn: ({ recordId, year, opinion }: { recordId: number; year: string; opinion?: string }) =>
      DestroyApi.approve(recordId, year, opinion),
    onSuccess: () => {
      toast.success('已批准销毁')
      closeConfirm()
      queryClient.invalidateQueries({ queryKey: ['destroy', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
      queryClient.invalidateQueries({ queryKey: ['approve', 'history'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ recordId, year, opinion }: { recordId: number; year: string; opinion?: string }) =>
      DestroyApi.reject(recordId, year, opinion),
    onSuccess: () => {
      toast.success('已驳回销毁申请')
      closeConfirm()
      queryClient.invalidateQueries({ queryKey: ['destroy', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['volume'] })
      queryClient.invalidateQueries({ queryKey: ['approve', 'history'] })
    },
  })

  function openConfirm(vol: ArchiveVolumeListVO, type: 'approve' | 'reject') {
    setSelected(vol)
    setActionType(type)
    setConfirmInput('')
    setOpinion('')
    setConfirmOpen(true)
  }

  function closeConfirm() {
    setConfirmOpen(false)
    setSelected(null)
    setActionType(null)
    setConfirmInput('')
    setOpinion('')
  }

  function handleSubmit() {
    if (!selected || !actionType) return

    if (actionType === 'approve') {
      if (confirmInput.trim() !== '确认销毁') {
        toast.error('请输入"确认销毁"以通过审批')
        return
      }
      approveMutation.mutate({
        recordId: selected.recordId,
        year: selected.year,
        opinion: opinion.trim() || undefined,
      })
    } else {
      if (!opinion.trim()) {
        toast.error('驳回时必须填写审批意见')
        return
      }
      rejectMutation.mutate({
        recordId: selected.recordId,
        year: selected.year,
        opinion: opinion.trim(),
      })
    }
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending

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
          <span className="font-medium text-slate-title max-w-[200px] truncate block">
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
          return (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:bg-red-50"
                      onClick={() => openConfirm(vol, 'approve')}
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>通过</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-body hover:bg-slate-100"
                      onClick={() => openConfirm(vol, 'reject')}
                    >
                      <XCircle size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>驳回</TooltipContent>
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

  /* ── 确认弹窗内容 ─────────────────────────────────────────── */
  const isApprove = actionType === 'approve'

  const confirmBody = (
    <div className="space-y-4">
      {selected && (
        <>
          <div
            className={cn(
              'rounded-card border p-4',
              isApprove ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
            )}
          >
            <div
              className={cn(
                'mb-2 flex items-center gap-2',
                isApprove ? 'text-red-700' : 'text-orange-700'
              )}
            >
              {isApprove ? <AlertTriangle size={18} /> : <ShieldAlert size={18} />}
              <span className="text-sm font-semibold">
                {isApprove ? '最终确认：批准销毁' : '驳回销毁申请'}
              </span>
            </div>
            <div className="space-y-1 text-sm text-slate-body">
              <div className="font-mono text-xs text-primary-dark">{selected.archiveNo}</div>
              <div className="font-medium text-slate-title">{selected.volumeTitle}</div>
            </div>
          </div>

          {isApprove && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-title">
                请输入"确认销毁"以最终确认
                <span className="ml-1 text-xs font-normal text-slate-400">（防止误操作）</span>
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="输入：确认销毁"
                className={
                  confirmInput && confirmInput.trim() !== '确认销毁'
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                    : ''
                }
              />
              {confirmInput && confirmInput.trim() !== '确认销毁' && (
                <p className="mt-1 text-xs text-red-500">输入不正确，请输入"确认销毁"</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-body">
              审批意见
              <span className="ml-1 text-xs font-normal text-slate-400">
                {isApprove ? '（选填）' : '（驳回时必填）'}
              </span>
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              placeholder={isApprove ? '可填写审批意见...' : '请填写驳回原因...'}
              rows={3}
              className="w-full resize-none rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2.5 text-sm text-[var(--color-slate-title)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
          <Gavel size={20} className="text-red-600" />
          <h2 className="text-xl font-bold text-slate-title">销毁审批</h2>
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
        title={<span className="flex items-center gap-2"><Gavel size={22} className="text-red-600" />销毁审批</span>}
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
        <div className="hidden md:block overflow-auto">
          {isLoading ? (
            <div className="space-y-3 p-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState description="暂无待审批的销毁申请" />
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
                <div key={i} className="h-44 animate-pulse rounded-card bg-slate-100" />
              ))
            : records.length === 0
              ? <EmptyState description="暂无待审批的销毁申请" />
              : records.map((vol) => (
                  <div
                    key={`${vol.recordId}-${vol.year}`}
                    className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card active:scale-[0.99] transition-transform"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 font-mono text-[11px] text-slate-400 truncate">
                          {vol.archiveNo}
                        </div>
                        <div className="text-sm font-semibold text-slate-title line-clamp-2">
                          {vol.volumeTitle}
                        </div>
                      </div>
                      <StatusTag type="archive" value={10} />
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
                      <div className="flex justify-between">
                        <span className="text-slate-400">年度</span>
                        <span>{vol.year} 年</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">一级类目</span>
                        <span className="truncate text-right">{vol.categoryL1Label || vol.categoryL1 || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">立卷人</span>
                        <span>{vol.compiler || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600"
                        onClick={() => openConfirm(vol, 'approve')}
                      >
                        <CheckCircle2 size={13} className="mr-1" />
                        通过
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => openConfirm(vol, 'reject')}
                      >
                        <XCircle size={13} className="mr-1" />
                        驳回
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

      {/* ── 电脑端确认 Dialog ──────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2', isApprove ? 'text-red-700' : 'text-orange-700')}>
              {isApprove ? <AlertTriangle size={20} /> : <ShieldAlert size={20} />}
              {isApprove ? '确认批准销毁' : '确认驳回销毁申请'}
            </DialogTitle>
            <DialogDescription>
              {isApprove
                ? '此操作不可逆，案卷将被标记为已销毁。请确认已核对实物档案并完成审批流程。'
                : '驳回后，案卷将恢复为正常已归档状态，管理员可重新发起销毁申请。'}
            </DialogDescription>
          </DialogHeader>
          {confirmBody}
          <DialogFooter>
            <Button variant="outline" onClick={closeConfirm}>
              取消
            </Button>
            <Button
              className={isApprove ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}
              loading={isPending}
              onClick={handleSubmit}
            >
              {isApprove ? (
                <>
                  <CheckCircle2 size={16} className="mr-1.5" />
                  确认批准
                </>
              ) : (
                <>
                  <XCircle size={16} className="mr-1.5" />
                  确认驳回
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 手机端确认 Drawer ──────────────────────────────────── */}
      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className={cn('flex items-center gap-2', isApprove ? 'text-red-700' : 'text-orange-700')}>
              {isApprove ? <AlertTriangle size={20} /> : <ShieldAlert size={20} />}
              {isApprove ? '确认批准销毁' : '确认驳回销毁申请'}
            </DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>{confirmBody}</DrawerBody>
          <DrawerFooter className="max-md:flex-row max-md:justify-stretch">
            <Button variant="outline" className="max-md:flex-1" onClick={closeConfirm}>
              取消
            </Button>
            <Button
              className={cn(
                'max-md:flex-1',
                isApprove ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
              )}
              loading={isPending}
              onClick={handleSubmit}
            >
              {isApprove ? (
                <>
                  <CheckCircle2 size={16} className="mr-1.5" />
                  确认批准
                </>
              ) : (
                <>
                  <XCircle size={16} className="mr-1.5" />
                  确认驳回
                </>
              )}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
