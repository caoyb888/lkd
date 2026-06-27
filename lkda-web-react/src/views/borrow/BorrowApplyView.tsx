import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft,
  BookOpen,
  FileCheck,
  FolderOpen,
  Package,
  PenLine,
  Send,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { NumberInput } from '@/components/ui/number-input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { VolumeApi } from '@/api/volume'
import { BorrowApi, type BorrowApplyDTO } from '@/api/borrow'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import { cn } from '@/lib/utils'

/* ── Zod 校验 ───────────────────────────────────────────────── */
const formSchema = z.object({
  applyCount: z.number().min(1, '申请份数至少为 1'),
  planReturnDate: z.instanceof(Date, { message: '请选择计划归还日期' }),
  reason: z.string().min(5, '借阅原因至少 5 个字'),
})

type FormData = z.infer<typeof formSchema>

/* ── 信息项组件 ─────────────────────────────────────────────── */
function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-[var(--text-faint)]">{label}</span>
      <span className="text-right text-slate-title">{children}</span>
    </div>
  )
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function BorrowApplyView() {
  const navigate = useNavigate()
  const { archiveNo } = useParams<{ archiveNo: string }>()
  const decodedArchiveNo = archiveNo ? decodeURIComponent(archiveNo) : ''

  /* ── 查询档案信息 ─────────────────────────────────────────── */
  const {
    data: volume,
    isLoading: volumeLoading,
  } = useQuery({
    queryKey: ['volume', 'by-archive-no', decodedArchiveNo],
    queryFn: () => VolumeApi.byArchiveNo(decodedArchiveNo),
    enabled: !!decodedArchiveNo,
  })

  const availableCopies = useMemo(() => {
    if (!volume) return 0
    return Math.max(0, (volume.copies ?? 1) - (volume.borrowedCopies ?? 0))
  }, [volume])

  /* ── 表单 ─────────────────────────────────────────────────── */
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applyCount: 1,
      planReturnDate: undefined,
      reason: '',
    },
  })

  // 无需回填 archiveNo，提交时直接使用 volume.archiveNo

  /* ── 份数超限即时提示 ─────────────────────────────────────── */
  const [countError, setCountError] = useState('')

  function handleCountChange(val: number) {
    form.setValue('applyCount', val, { shouldValidate: true })
    if (val > availableCopies) {
      const msg = `申请份数不能超过剩余在库份数（${availableCopies} 份）`
      setCountError(msg)
      toast.error(msg)
    } else {
      setCountError('')
    }
  }

  /* ── 提交 ─────────────────────────────────────────────────── */
  const applyMutation = useMutation({
    mutationFn: (data: BorrowApplyDTO) => BorrowApi.apply(data),
    onSuccess: () => {
      toast.success('借阅申请已提交，请等待审批')
      navigate('/borrow/my')
    },
  })

  function onSubmit(data: FormData) {
    if (!volume) {
      toast.error('档案信息加载失败，请返回重试')
      return
    }
    if (data.applyCount > availableCopies) {
      toast.error(`申请份数不能超过剩余在库份数（${availableCopies} 份）`)
      return
    }
    applyMutation.mutate({
      archiveNo: volume.archiveNo,
      applyCount: data.applyCount,
      planReturnDate: format(data.planReturnDate, 'yyyy-MM-dd'),
      reason: data.reason.trim(),
    })
  }

  /* ── 加载态 ───────────────────────────────────────────────── */
  if (volumeLoading) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="发起借阅申请" />
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
          <div className="h-72 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
        </div>
      </div>
    )
  }

  if (!volume) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </div>
        <PageHeader title="发起借阅申请" />
        <EmptyState description="未找到该档案，请返回列表重新选择" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-28 md:pb-6">
      {/* ── 返回按钮 ─────────────────────────────────────────── */}
      <div className="mb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary-dark" />
            发起借阅申请
          </span>
        }
      />

      {/* ── 主内容区：电脑端左右分栏 ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── 左侧：申请表单 ─────────────────────────────────── */}
        <div className="lg:col-span-2">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card md:p-6"
          >
            <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-title">
              <PenLine size={18} className="text-primary" />
              借阅申请表
            </h3>

            <div className="space-y-5">
              {/* 档号（只读） */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  档号
                </label>
                <div className="flex h-10 items-center rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] px-3 text-sm text-slate-title">
                  <FileCheck size={16} className="mr-2 text-primary opacity-60" />
                  {volume.archiveNo}
                </div>
              </div>

              {/* 档案名称（只读） */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  档案名称
                </label>
                <div className="flex h-10 items-center rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] px-3 text-sm text-slate-title">
                  <FolderOpen size={16} className="mr-2 text-primary opacity-60" />
                  <span className="truncate">{volume.volumeTitle}</span>
                </div>
              </div>

              {/* 申请份数 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  申请份数
                  <span className="ml-2 text-xs font-normal text-[var(--text-faint)]">
                    （剩余 {availableCopies} 份）
                  </span>
                </label>
                <Controller
                  name="applyCount"
                  control={form.control}
                  render={({ field }) => (
                    <NumberInput
                      value={field.value}
                      onChange={handleCountChange}
                      min={1}
                      max={availableCopies}
                      className="w-full md:w-auto"
                    />
                  )}
                />
                {countError && (
                  <p className="mt-1.5 text-xs text-red-400">{countError}</p>
                )}
                {form.formState.errors.applyCount && !countError && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {form.formState.errors.applyCount.message}
                  </p>
                )}
              </div>

              {/* 计划归还日期 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  计划归还日期 <span className="text-red-400">*</span>
                </label>
                <Controller
                  name="planReturnDate"
                  control={form.control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="请选择归还日期"
                    />
                  )}
                />
                {form.formState.errors.planReturnDate && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {form.formState.errors.planReturnDate.message}
                  </p>
                )}
              </div>

              {/* 借阅原因 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  借阅原因 <span className="text-red-400">*</span>
                </label>
                <textarea
                  {...form.register('reason')}
                  rows={4}
                  placeholder="请说明借阅用途，至少 5 个字"
                  maxLength={500}
                  className={cn(
                    'w-full resize-none rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2.5 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
                  )}
                />
                {form.formState.errors.reason && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {form.formState.errors.reason.message}
                  </p>
                )}
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-border-light)] pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                取消
              </Button>
              <Button
                type="submit"
                loading={applyMutation.isPending}
                disabled={availableCopies <= 0}
              >
                <Send size={16} className="mr-1.5" />
                提交申请
              </Button>
            </div>
          </form>
        </div>

        {/* ── 右侧：档案信息卡片 ───────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package size={18} className="text-primary" />
                档案信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="mb-3 rounded-lg bg-[var(--color-bg-soft)] p-3">
                <div className="mb-1 font-mono text-xs font-semibold text-primary-dark">
                  {volume.archiveNo}
                </div>
                <div className="text-sm font-medium text-slate-title line-clamp-2">
                  {volume.volumeTitle}
                </div>
              </div>

              <InfoItem label="年度">{volume.year} 年</InfoItem>
              <InfoItem label="一级类目">
                {volume.categoryL1Label || volume.categoryL1 || '—'}
              </InfoItem>
              <InfoItem label="密级">
                {volume.securityLevelLabel || volume.securityLevel || '—'}
              </InfoItem>
              <InfoItem label="保管期限">
                {volume.retentionPeriodLabel || volume.retentionPeriod || '—'}
              </InfoItem>
              <InfoItem label="总份数">{volume.copies ?? 1} 份</InfoItem>
              <InfoItem label="已借出">{volume.borrowedCopies ?? 0} 份</InfoItem>
              <InfoItem label="剩余在库">
                <span
                  className={cn(
                    'font-semibold',
                    availableCopies > 0 ? 'text-primary-dark' : 'text-red-400'
                  )}
                >
                  {availableCopies} 份
                </span>
              </InfoItem>

              <div className="border-t border-[var(--color-border-light)] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-body">归档状态</span>
                  <StatusTag type="archive" value={volume.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-body">在库状态</span>
                  <StatusTag type="stock" value={volume.inStock} />
                </div>
              </div>

              {availableCopies <= 0 && (
                <div className="rounded-lg bg-red-500/15 p-3 text-center">
                  <p className="text-sm font-medium text-red-300">
                    该档案已全部借出，暂不可申请
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
