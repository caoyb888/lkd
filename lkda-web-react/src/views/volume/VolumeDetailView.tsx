import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Send,
  BookOpen,
  Files,
  Printer,
  Trash2,
  Check,
  Clock,
  UserCheck,
  FolderCheck,
  FileCheck,
  MoreHorizontal,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import { VolumeApi } from '@/api/volume'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import type { ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const STEPS = [
  { label: '草稿', icon: Edit },
  { label: '待审核', icon: Clock },
  { label: '待确认', icon: UserCheck },
  { label: '已归档', icon: FolderCheck },
]

const ACTION_STYLE: Record<string, { label: string; className: string }> = {
  PASS: { label: '通过', className: 'bg-emerald-50 text-emerald-700' },
  REJECT: { label: '驳回', className: 'bg-red-50 text-red-700' },
  BACK: { label: '退回', className: 'bg-blue-50 text-blue-700' },
}

const BIZ_TYPE: Record<number, string> = {
  1: '归档审核',
  2: '归档确认',
  3: '借阅审批',
  4: '销毁审批',
}

/* ── 状态元数据 ─────────────────────────────────────────────── */
const STATUS_META: Record<number, { text: string; className: string }> = {
  0: { text: '草稿', className: 'bg-slate-100 text-slate-600' },
  1: { text: '待审核', className: 'bg-yellow-50 text-yellow-700' },
  2: { text: '待确认', className: 'bg-blue-50 text-blue-700' },
  3: { text: '已归档', className: 'bg-emerald-50 text-emerald-700' },
  10: { text: '销毁待审批', className: 'bg-violet-50 text-violet-700' },
  11: { text: '已销毁', className: 'bg-red-50 text-red-700' },
}

function resolveStatusMeta(detail: ArchiveVolumeDetailVO | null) {
  if (!detail) return STATUS_META[0]
  if (detail.destroyFlag === 1) return STATUS_META[11]
  if (detail.pendingDestroy === 1) return STATUS_META[10]
  return STATUS_META[detail.status] ?? STATUS_META[0]
}

/* ── Stepper 组件 ───────────────────────────────────────────── */
function Stepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center justify-between gap-2 md:gap-4">
      {STEPS.map((step, idx) => {
        const Icon = step.icon
        const isCompleted = idx < activeIndex
        const isCurrent = idx === activeIndex
        const isPending = idx > activeIndex

        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors md:h-10 md:w-10',
                  isCompleted && 'border-primary bg-primary text-white',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  isPending && 'border-slate-200 bg-white text-slate-400'
                )}
              >
                {isCompleted ? (
                  <Check size={18} />
                ) : (
                  <Icon size={16} />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium md:text-sm',
                  isCompleted && 'text-primary-dark',
                  isCurrent && 'text-primary font-semibold',
                  isPending && 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 h-0.5 flex-1 rounded-full md:mx-2',
                  idx < activeIndex ? 'bg-primary' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── 信息项组件 ─────────────────────────────────────────────── */
function InfoItem({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="break-words text-sm text-slate-title">
        {children ?? '—'}
      </span>
    </div>
  )
}

/* ── 审批历史时间线 ─────────────────────────────────────────── */
function ApprovalTimeline({ logs, loading }: { logs: ApproveLogVO[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-slate-100" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return <EmptyState description="暂无审批记录" />
  }

  return (
    <div className="relative py-4">
      {/* 竖线 */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[var(--color-border-light)] md:left-[15px]" />

      <div className="space-y-5">
        {logs.map((log) => {
          const action = ACTION_STYLE[log.action] ?? {
            label: log.action,
            className: 'bg-slate-100 text-slate-600',
          }
          return (
            <div key={log.logId} className="relative flex gap-4 pl-1 md:gap-5">
              {/* 圆点 */}
              <div
                className={cn(
                  'z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm md:h-4 md:w-4',
                  log.action === 'PASS'
                    ? 'bg-emerald-500'
                    : log.action === 'REJECT'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                )}
              />

              {/* 内容卡片 */}
              <div className="flex-1 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-3 shadow-sm md:p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-body">
                    {BIZ_TYPE[log.businessType] ?? '审批'}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-semibold',
                      action.className
                    )}
                  >
                    {action.label}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-title">
                    <UserCheck size={12} className="text-slate-400" />
                    {log.approverName}
                  </span>
                </div>
                {log.opinion && (
                  <p className="rounded-lg bg-[var(--color-bg-lighter)] p-2.5 text-sm leading-relaxed text-slate-body">
                    {log.opinion}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {log.createdAt?.slice(0, 16).replace('T', ' ')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function VolumeDetailView() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const dictStore = useDictStore()

  const recordId = Number(id)
  const year = searchParams.get('year') ?? ''

  const [activeTab, setActiveTab] = useState('location')

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ['volume', 'detail', recordId, year],
    queryFn: () => VolumeApi.detail(recordId, year),
    enabled: !!recordId && !!year,
  })

  const {
    data: logs,
    isLoading: logLoading,
  } = useQuery({
    queryKey: ['volume', 'logs', recordId],
    queryFn: () => VolumeApi.approveLogs(recordId),
    enabled: !!recordId,
  })

  /* ── 权限计算 ─────────────────────────────────────────────── */
  const isAdmin = authStore.isAdmin
  const isLeader = authStore.isLeader
  const userId = authStore.userInfo?.userId

  const isCompilerOrAdmin =
    isAdmin || (detail?.compilerId != null && detail.compilerId === userId)

  const showEdit = detail?.status === 0 && isCompilerOrAdmin
  const showSubmit = detail?.status === 0 && isCompilerOrAdmin
  const showBorrow =
    detail?.status === 3 &&
    detail.inStock === 1 &&
    (detail.borrowedCopies ?? 0) < (detail.copies ?? 1) &&
    !isAdmin &&
    !isLeader
  const showPrint = (detail?.status ?? 0) >= 1
  const showDestroy =
    detail?.status === 3 && detail.destroyFlag === 0 && isAdmin

  /* ── 操作 ─────────────────────────────────────────────────── */
  const submitMutation = useMutation({
    mutationFn: () => VolumeApi.submit(recordId, year),
    onSuccess: () => {
      toast.success('已提交审核')
      queryClient.invalidateQueries({ queryKey: ['volume', 'detail'] })
    },
  })

  function handleSubmit() {
    if (!window.confirm('提交审核后，案卷将进入待审核状态，不可再编辑，确认提交？'))
      return
    submitMutation.mutate()
  }

  function goEdit() {
    navigate(`/volume/edit/${recordId}?year=${year}`)
  }

  function goBorrow() {
    if (!detail) return
    navigate(`/borrow/apply/${encodeURIComponent(detail.archiveNo)}`)
  }

  function goFiles() {
    navigate(`/file/list/${recordId}?year=${year}`)
  }

  function goPrint() {
    navigate(`/print/preview/${recordId}?year=${year}`)
  }

  function goDestroy() {
    navigate(`/destroy/apply?recordId=${recordId}&year=${year}`)
  }

  /* ── 字典标签 ─────────────────────────────────────────────── */
  const dictLabel = (code: string, value?: string | null) =>
    dictStore.getLabel(code, value ?? '') || value || '—'

  /* ── 加载态 ───────────────────────────────────────────────── */
  if (detailLoading) {
    return (
      <div className="p-3 md:p-4">
        <PageHeader title="案卷详情" />
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-card bg-slate-100" />
          <div className="h-48 animate-pulse rounded-card bg-slate-100" />
          <div className="h-16 animate-pulse rounded-card bg-slate-100" />
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="p-3 md:p-4">
        <PageHeader title="案卷详情" />
        <EmptyState description="未找到该案卷，请返回列表重新选择" />
      </div>
    )
  }

  const statusMeta = resolveStatusMeta(detail)
  const stepsActive = Math.min(detail.status, 3)

  return (
    <div className="p-3 md:p-4 pb-28 md:pb-4">
      {/* ── 页头 ─────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageHeader title={<span className="inline-flex items-center gap-2"><BookOpen size={20} className="text-primary-dark" />案卷详情</span>} />
          <span
            className={cn(
              'inline-flex items-center rounded-tag px-3 py-1 text-xs font-semibold',
              statusMeta.className
            )}
          >
            {statusMeta.text}
          </span>
        </div>

        {/* 桌面端操作按钮 */}
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1.5" />
            返回
          </Button>
          {showEdit && (
            <Button variant="outline" className="border-primary text-primary hover:bg-[var(--color-bg-soft)]" onClick={goEdit}>
              <Edit size={16} className="mr-1.5" />
              编辑
            </Button>
          )}
          {showSubmit && (
            <Button loading={submitMutation.isPending} onClick={handleSubmit}>
              <Send size={16} className="mr-1.5" />
              提交审核
            </Button>
          )}
          {showBorrow && (
            <Button onClick={goBorrow}>
              <BookOpen size={16} className="mr-1.5" />
              申请借阅
            </Button>
          )}
          <Button variant="outline" className="border-primary text-primary hover:bg-[var(--color-bg-soft)]" onClick={goFiles}>
            <Files size={16} className="mr-1.5" />
            卷内文件目录
          </Button>
          {showPrint && (
            <Button variant="outline" onClick={goPrint}>
              <Printer size={16} className="mr-1.5" />
              打印
            </Button>
          )}
          {showDestroy && (
            <Button variant="danger" onClick={goDestroy}>
              <Trash2 size={16} className="mr-1.5" />
              申请销毁
            </Button>
          )}
        </div>
      </div>

      {/* ── 状态时间线 ─────────────────────────────────────────── */}
      <div className="mb-3 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card md:p-5">
        <Stepper activeIndex={stepsActive} />

        {/* 档号横幅 */}
        <div className="mt-3 flex flex-wrap items-start gap-3 rounded-[10px] border border-[var(--color-border-medium)] bg-gradient-to-r from-[var(--color-bg-soft)] to-[var(--color-bg-lighter)] p-3">
          <FileCheck size={22} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-base font-bold tracking-wide text-primary-dark md:text-lg">
              {detail.archiveNo}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-title">
              {detail.volumeTitle}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] shadow-card">
          <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="w-max min-w-full justify-start rounded-none rounded-t-card border-b border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] p-0 px-2">
            {[
              { value: 'location', label: '分类定位' },
              { value: 'description', label: '案卷描述' },
              { value: 'flow', label: '流程信息' },
              ...(detail.remark || detail.notes
                ? [{ value: 'notes', label: '备考' }]
                : []),
              { value: 'history', label: '审批历史' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent px-3 py-3 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:px-5"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>

          <div className="p-4 md:p-5">
            {/* 分类定位 */}
            <TabsContent value="location" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="全宗号">
                  {dictLabel('fonds_no', detail.fondsNo)}
                </InfoItem>
                <InfoItem label="年度">{detail.year} 年</InfoItem>
                <InfoItem label="一级类目">
                  {detail.categoryL1Label || dictLabel('category_l1', detail.categoryL1)}
                </InfoItem>
                <InfoItem label="二级类目">
                  {detail.categoryL2
                    ? dictLabel('category_l2', detail.categoryL2)
                    : '—'}
                </InfoItem>
                <InfoItem label="三级类目">
                  {detail.categoryL3
                    ? dictLabel('category_l3', detail.categoryL3)
                    : '—'}
                </InfoItem>
                <InfoItem label="设备代号">
                  {dictLabel('equipment_code', detail.deviceCode)}
                </InfoItem>
                <InfoItem label="案卷号">
                  <span className="font-mono">{detail.volumeNo || '—'}</span>
                </InfoItem>
                <InfoItem label="档号" className="sm:col-span-2 lg:col-span-4">
                  <span className="font-mono text-sm font-semibold text-primary-dark">
                    {detail.archiveNo}
                  </span>
                </InfoItem>
              </div>
            </TabsContent>

            {/* 案卷描述 */}
            <TabsContent value="description" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="案卷题名" className="sm:col-span-2 lg:col-span-4">
                  <span className="text-base font-semibold">{detail.volumeTitle}</span>
                </InfoItem>
                <InfoItem label="编制单位" className="sm:col-span-2">
                  {detail.compileUnit || '—'}
                </InfoItem>
                <InfoItem label="密级">
                  {detail.securityLevel ? (
                    <span className="inline-flex items-center rounded-tag bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                      {detail.securityLevelLabel || detail.securityLevel}
                    </span>
                  ) : (
                    '—'
                  )}
                </InfoItem>
                <InfoItem label="保管期限">
                  {detail.retentionPeriodLabel || detail.retentionPeriod || '—'}
                </InfoItem>
                <InfoItem label="件数">{detail.copies ?? '—'} 件</InfoItem>
                <InfoItem label="页数">
                  {detail.totalPages ? `${detail.totalPages} 页` : '—'}
                </InfoItem>
                <InfoItem label="在库状态">
                  <StatusTag type="stock" value={detail.inStock} />
                </InfoItem>
                <InfoItem label="已借出份数">
                  {detail.borrowedCopies ?? 0} / {detail.copies ?? 1} 份
                </InfoItem>
              </div>
            </TabsContent>

            {/* 流程信息 */}
            <TabsContent value="flow" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="立卷人">{detail.compiler || '—'}</InfoItem>
                <InfoItem label="立卷日期">{detail.compileDate || '—'}</InfoItem>
                <InfoItem label="审核人">{detail.reviewer || '—'}</InfoItem>
                <InfoItem label="归档日期">{detail.archiveDate || '—'}</InfoItem>
                <InfoItem label="创建时间">
                  {detail.createdAt?.slice(0, 16).replace('T', ' ')}
                </InfoItem>
                <InfoItem label="最后更新">
                  {detail.updatedAt?.slice(0, 16).replace('T', ' ')}
                </InfoItem>
              </div>
            </TabsContent>

            {/* 备考 */}
            {detail.remark || detail.notes ? (
              <TabsContent value="notes" className="mt-0">
                <div className="grid grid-cols-1 gap-4">
                  {detail.remark && (
                    <InfoItem label="备考说明">
                      <p className="whitespace-pre-wrap rounded-lg bg-[var(--color-bg-lighter)] p-3 text-sm leading-relaxed text-slate-body">
                        {detail.remark}
                      </p>
                    </InfoItem>
                  )}
                  {detail.notes && (
                    <InfoItem label="备注">
                      <p className="whitespace-pre-wrap rounded-lg bg-[var(--color-bg-lighter)] p-3 text-sm leading-relaxed text-slate-body">
                        {detail.notes}
                      </p>
                    </InfoItem>
                  )}
                </div>
              </TabsContent>
            ) : null}

            {/* 审批历史 */}
            <TabsContent value="history" className="mt-0">
              <ApprovalTimeline logs={logs ?? []} loading={logLoading} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* ── 底部操作栏（手机端） ──────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1.5" />
            返回
          </Button>

          {/* 手机端：主要按钮 + 更多Popover */}
          <div className="flex items-center gap-2">
            {showEdit && (
              <Button variant="outline" size="sm" onClick={goEdit}>
                <Edit size={14} className="mr-1" />
                编辑
              </Button>
            )}
            {showSubmit && (
              <Button
                size="sm"
                loading={submitMutation.isPending}
                onClick={handleSubmit}
              >
                <Send size={14} className="mr-1" />
                提交
              </Button>
            )}
            {showBorrow && (
              <Button size="sm" onClick={goBorrow}>
                <BookOpen size={14} className="mr-1" />
                借阅
              </Button>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal size={14} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={goFiles}
                  >
                    <Files size={14} className="mr-2" />
                    卷内文件目录
                  </Button>
                  {showPrint && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={goPrint}
                    >
                      <Printer size={14} className="mr-2" />
                      打印
                    </Button>
                  )}
                  {showDestroy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={goDestroy}
                    >
                      <Trash2 size={14} className="mr-2" />
                      申请销毁
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  )
}
