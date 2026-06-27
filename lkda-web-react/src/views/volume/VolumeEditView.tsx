import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft,
  FolderCheck,
  ArrowRight,
  FileCheck,
  FileText,
  Loader2,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import BottomActionBar from '@/components/BottomActionBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VolumeApi, type ArchiveVolumeSaveDTO } from '@/api/volume'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2017 },
  (_, i) => String(CURRENT_YEAR - i)
)

const STATUS_TAG: Record<number, { text: string; className: string }> = {
  0: { text: '草稿', className: 'bg-[var(--color-bg-soft)] text-slate-body' },
  1: { text: '待审核', className: 'bg-yellow-500/15 text-yellow-300' },
  2: { text: '待确认', className: 'bg-blue-500/15 text-blue-300' },
  3: { text: '已归档', className: 'bg-emerald-500/15 text-emerald-300' },
}

/* ── Zod 校验 ───────────────────────────────────────────────── */
const formSchema = z.object({
  fondsNo: z.string().min(1, '请选择全宗号'),
  year: z.string().min(1, '请选择年度'),
  categoryL1: z.string().min(1, '请选择一级类目'),
  categoryL2: z.string().optional(),
  categoryL3: z.string().optional(),
  deviceCode: z.string().min(1, '请选择设备代号'),
  volumeTitle: z.string().min(1, '请输入案卷题名').max(200, '不超过 200 字'),
  compileUnit: z.string().optional(),
  securityLevel: z.string().optional(),
  retentionPeriod: z.string().optional(),
  copies: z.number().min(1, '件数最小为 1'),
  totalPages: z.number().optional(),
  compiler: z.string().optional(),
  compileDate: z.string().optional(),
  reviewer: z.string().optional(),
  archiveDate: z.string().optional(),
  remark: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

/* ── 日期字符串 ↔ Date 转换组件 ─────────────────────────────── */
function DateStringField({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value?: string
  onChange: (v?: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const date = value ? parseISO(value) : undefined
  return (
    <DatePicker
      value={date}
      onChange={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

/* ── 表单区块组件 ───────────────────────────────────────────── */
function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-gradient-to-b from-primary to-primary-dark" />
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <span className="text-xs text-[var(--text-faint)]">{subtitle}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/* ── 表单字段包装 ───────────────────────────────────────────── */
function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-body">
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-400">{message}</p>
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function VolumeEditView() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const authStore = useAuthStore()
  const dictStore = useDictStore()

  const recordId = id ? Number(id) : undefined
  const isEdit = !!recordId
  const yearFromQuery = searchParams.get('year') ?? undefined

  const [currentStatus, setCurrentStatus] = useState(0)
  const readonly = currentStatus > 0

  /* ── 字典 ─────────────────────────────────────────────────── */
  const fondsNoOptions = dictStore.getItems('fonds_no')
  const categoryL1Options = dictStore.getItems('category_l1')
  const categoryL2Options = dictStore.getItems('category_l2')
  const categoryL3Options = dictStore.getItems('category_l3')
  const equipCodeOptions = dictStore.getItems('equipment_code')
  const securityOptions = dictStore.getItems('security_level')
  const retentionOptions = dictStore.getItems('retention_period')

  /* ── 表单 ─────────────────────────────────────────────────── */
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fondsNo: '',
      year: String(CURRENT_YEAR),
      categoryL1: '',
      categoryL2: '',
      categoryL3: '',
      deviceCode: '',
      volumeTitle: '',
      compileUnit: '',
      securityLevel: '',
      retentionPeriod: '',
      copies: 1,
      totalPages: undefined,
      compiler: authStore.userInfo?.nickname ?? '',
      compileDate: '',
      reviewer: '',
      archiveDate: '',
      remark: '',
      notes: '',
    },
  })

  const watchCategoryL1 = form.watch('categoryL1')
  const watchCategoryL2 = form.watch('categoryL2')

  /* ── 类目联动 ─────────────────────────────────────────────── */
  useEffect(() => {
    if (watchCategoryL1) return
    form.setValue('categoryL2', '', { shouldValidate: false })
    form.setValue('categoryL3', '', { shouldValidate: false })
  }, [watchCategoryL1, form])

  useEffect(() => {
    if (watchCategoryL2) return
    form.setValue('categoryL3', '', { shouldValidate: false })
  }, [watchCategoryL2, form])

  /* ── 编辑回填 ─────────────────────────────────────────────── */
  const { isLoading: detailLoading } = useQuery({
    queryKey: ['volume', 'detail', recordId, yearFromQuery],
    queryFn: async () => {
      if (!recordId) return null
      let year = yearFromQuery
      if (!year) {
        const pageRes = await VolumeApi.page({
          current: 1,
          size: 1,
          keyword: String(recordId),
        })
        year = pageRes.records[0]?.year
      }
      if (!year) throw new Error('无法确定案卷年度')
      const detail = await VolumeApi.detail(recordId, year)
      setCurrentStatus(detail.status)

      form.reset({
        fondsNo: detail.fondsNo ?? '',
        year: detail.year ?? String(CURRENT_YEAR),
        categoryL1: detail.categoryL1 ?? '',
        categoryL2: detail.categoryL2 ?? '',
        categoryL3: detail.categoryL3 ?? '',
        deviceCode: detail.deviceCode ?? '',
        volumeTitle: detail.volumeTitle ?? '',
        compileUnit: detail.compileUnit ?? '',
        securityLevel: detail.securityLevel ?? '',
        retentionPeriod: detail.retentionPeriod ?? '',
        copies: detail.copies ?? 1,
        totalPages: detail.totalPages || undefined,
        compiler: detail.compiler ?? '',
        compileDate: detail.compileDate ?? '',
        reviewer: detail.reviewer ?? '',
        archiveDate: detail.archiveDate ?? '',
        remark: detail.remark ?? '',
        notes: detail.notes ?? '',
      })
      setArchiveNoPreview(detail.archiveNo ?? '')
      return detail
    },
    enabled: isEdit,
  })

  /* ── 档号预览 ─────────────────────────────────────────────── */
  const [archiveNoPreview, setArchiveNoPreview] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const previewDeps = form.watch([
    'fondsNo',
    'year',
    'categoryL1',
    'categoryL2',
    'categoryL3',
    'deviceCode',
  ])

  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPreviewNo = useCallback(async () => {
    const [fondsNo, year, categoryL1, categoryL2, categoryL3, deviceCode] =
      previewDeps
    if (!fondsNo || !year || !categoryL1 || !deviceCode) {
      setArchiveNoPreview('')
      return
    }
    setPreviewLoading(true)
    try {
      const no = await VolumeApi.previewNo({
        fondsNo,
        categoryL1,
        categoryL2: categoryL2 || undefined,
        categoryL3: categoryL3 || undefined,
        deviceCode,
        year,
      })
      setArchiveNoPreview(no)
    } catch {
      // 错误由 http 拦截器统一提示
    } finally {
      setPreviewLoading(false)
    }
  }, [previewDeps])

  useEffect(() => {
    if (readonly) return
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(fetchPreviewNo, 300)
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [fetchPreviewNo, readonly])

  /* ── 提交操作 ─────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (payload: ArchiveVolumeSaveDTO) => {
      if (isEdit && recordId) {
        await VolumeApi.update(recordId, payload.year, payload)
        return recordId
      }
      const vo = await VolumeApi.saveDraft(payload)
      return vo.recordId
    },
    onSuccess: (returnedId) => {
      toast.success(isEdit ? '草稿已保存' : '草稿已创建')
      if (!isEdit) {
        navigate(`/volume/edit/${returnedId}?year=${form.getValues('year')}`, { replace: true })
      }
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (payload: ArchiveVolumeSaveDTO) => {
      let targetId = recordId
      if (!targetId) {
        const vo = await VolumeApi.saveDraft(payload)
        targetId = vo.recordId
      } else {
        await VolumeApi.update(targetId, payload.year, payload)
      }
      await VolumeApi.submit(targetId, payload.year)
      return targetId
    },
    onSuccess: (targetId) => {
      toast.success('已成功提交审核')
      navigate(`/volume/detail/${targetId}?year=${form.getValues('year')}`)
    },
  })

  function buildPayload(): ArchiveVolumeSaveDTO {
    const data = form.getValues()
    return {
      fondsNo: data.fondsNo,
      year: data.year,
      categoryL1: data.categoryL1,
      categoryL2: data.categoryL2 || undefined,
      categoryL3: data.categoryL3 || undefined,
      deviceCode: data.deviceCode,
      volumeTitle: data.volumeTitle,
      compileUnit: data.compileUnit || undefined,
      securityLevel: data.securityLevel || undefined,
      retentionPeriod: data.retentionPeriod || undefined,
      copies: data.copies,
      totalPages: data.totalPages || undefined,
      compiler: data.compiler || undefined,
      compileDate: data.compileDate || undefined,
      reviewer: data.reviewer || undefined,
      archiveDate: data.archiveDate || undefined,
      remark: data.remark || undefined,
      notes: data.notes || undefined,
    }
  }

  function onSaveDraft() {
    form.handleSubmit(() => {
      saveMutation.mutate(buildPayload())
    })()
  }

  function onSubmitForReview() {
    form.handleSubmit(() => {
      if (
        !window.confirm(
          '提交审核后，案卷将进入待审核状态，不可再编辑，确认提交？'
        )
      )
        return
      submitMutation.mutate(buildPayload())
    })()
  }

  /* ── 渲染 ─────────────────────────────────────────────────── */
  const statusTag = STATUS_TAG[currentStatus] ?? STATUS_TAG[0]

  if (detailLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="mt-3 text-sm text-slate-body">加载案卷数据中…</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      {/* ── 页头 ─────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <PageHeader title={isEdit ? '编辑案卷' : '新建案卷'} />
        {isEdit && (
          <span
            className={cn(
              'inline-flex items-center rounded-tag px-3 py-1 text-xs font-semibold',
              statusTag.className
            )}
          >
            {statusTag.text}
          </span>
        )}
      </div>

      {/* ── 只读提示 ─────────────────────────────────────────── */}
      {readonly && (
        <Alert className="mb-4">
          <AlertDescription>
            该案卷当前状态为「{statusTag.text}」，已提交至审批流程，内容只读。
          </AlertDescription>
        </Alert>
      )}

      <form
        id="volume-form"
        onSubmit={(e) => e.preventDefault()}
        className="mx-auto flex max-w-[1100px] flex-col gap-4"
      >
        {/* ── 第一区：分类定位 ───────────────────────────────── */}
        <FormSection title="分类定位" subtitle="档号组成要素">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 全宗号 */}
            <div>
              <FieldLabel required>全宗号</FieldLabel>
              <Controller
                name="fondsNo"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择全宗号" />
                    </SelectTrigger>
                    <SelectContent>
                      {fondsNoOptions.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorText message={form.formState.errors.fondsNo?.message} />
            </div>

            {/* 年度 */}
            <div>
              <FieldLabel required>年度</FieldLabel>
              <Controller
                name="year"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择年度" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y} 年
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorText message={form.formState.errors.year?.message} />
            </div>

            {/* 一级类目 */}
            <div>
              <FieldLabel required>一级类目</FieldLabel>
              <Controller
                name="categoryL1"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择一级类目" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryL1Options.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorText message={form.formState.errors.categoryL1?.message} />
            </div>

            {/* 二级类目 */}
            <div>
              <FieldLabel>二级类目</FieldLabel>
              <Controller
                name="categoryL2"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly || !watchCategoryL1}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请先选择一级类目" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryL2Options.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 三级类目 */}
            <div>
              <FieldLabel>三级类目</FieldLabel>
              <Controller
                name="categoryL3"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly || !watchCategoryL2}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请先选择二级类目" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryL3Options.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 设备代号 */}
            <div>
              <FieldLabel required>设备代号</FieldLabel>
              <Controller
                name="deviceCode"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择设备代号" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipCodeOptions.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <ErrorText
                message={form.formState.errors.deviceCode?.message}
              />
            </div>
          </div>

          {/* 档号预览 */}
          <div className="mt-4 flex items-center gap-3 border-t border-dashed border-[var(--color-border-light)] pt-4">
            <span className="shrink-0 text-sm font-semibold text-slate-body">
              档号预览
            </span>
            <div
              className={cn(
                'flex flex-1 items-center gap-2.5 rounded-[10px] border px-4 py-3 transition-all',
                archiveNoPreview
                  ? 'border-primary bg-gradient-to-r from-[var(--color-bg-soft)] to-[var(--color-bg-lighter)]'
                  : 'border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-lighter)]'
              )}
            >
              {previewLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <span className="text-sm text-[var(--text-faint)]">
                    正在生成档号…
                  </span>
                </>
              ) : archiveNoPreview ? (
                <>
                  <FileCheck size={18} className="text-primary" />
                  <span className="font-mono text-lg font-bold tracking-wide text-primary-dark">
                    {archiveNoPreview}
                  </span>
                </>
              ) : (
                <>
                  <FileText size={18} className="text-[var(--text-faint)]" />
                  <span className="text-sm text-[var(--text-faint)]">
                    填写全宗号、年度、一级类目、设备代号后自动生成
                  </span>
                </>
              )}
            </div>
          </div>
        </FormSection>

        {/* ── 第二区：案卷描述 ───────────────────────────────── */}
        <FormSection title="案卷描述">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 案卷题名（跨列） */}
            <div className="md:col-span-2 lg:col-span-3">
              <FieldLabel required>案卷题名</FieldLabel>
              <Input
                {...form.register('volumeTitle')}
                placeholder="请输入案卷题名（必填）"
                maxLength={200}
                disabled={readonly}
              />
              <ErrorText
                message={form.formState.errors.volumeTitle?.message}
              />
            </div>

            {/* 编制单位 */}
            <div className="md:col-span-2">
              <FieldLabel>编制单位</FieldLabel>
              <Input
                {...form.register('compileUnit')}
                placeholder="请输入编制单位"
                disabled={readonly}
              />
            </div>

            {/* 密级 */}
            <div>
              <FieldLabel>密级</FieldLabel>
              <Controller
                name="securityLevel"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择密级" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityOptions.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 保管期限 */}
            <div>
              <FieldLabel>保管期限</FieldLabel>
              <Controller
                name="retentionPeriod"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择保管期限" />
                    </SelectTrigger>
                    <SelectContent>
                      {retentionOptions.map((item) => (
                        <SelectItem key={item.itemValue} value={item.itemValue}>
                          {item.itemLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* 件数 */}
            <div>
              <FieldLabel>件数</FieldLabel>
              <Controller
                name="copies"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    min={1}
                    max={9999}
                    disabled={readonly}
                  />
                )}
              />
              <ErrorText message={form.formState.errors.copies?.message} />
            </div>

            {/* 页数 */}
            <div>
              <FieldLabel>页数</FieldLabel>
              <Controller
                name="totalPages"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    min={0}
                    max={99999}
                    disabled={readonly}
                  />
                )}
              />
            </div>
          </div>
        </FormSection>

        {/* ── 第三区：流程信息 ───────────────────────────────── */}
        <FormSection title="流程信息">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 立卷人 */}
            <div>
              <FieldLabel>立卷人</FieldLabel>
              <Input
                {...form.register('compiler')}
                placeholder="请输入立卷人姓名"
                disabled={readonly}
              />
            </div>

            {/* 立卷日期 */}
            <div>
              <FieldLabel>立卷日期</FieldLabel>
              <Controller
                name="compileDate"
                control={form.control}
                render={({ field }) => (
                  <DateStringField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="请选择立卷日期"
                    disabled={readonly}
                  />
                )}
              />
            </div>

            {/* 审核人 */}
            <div>
              <FieldLabel>审核人</FieldLabel>
              <Input
                {...form.register('reviewer')}
                placeholder="请输入审核人姓名"
                disabled={readonly}
              />
            </div>

            {/* 归档日期 */}
            <div>
              <FieldLabel>归档日期</FieldLabel>
              <Controller
                name="archiveDate"
                control={form.control}
                render={({ field }) => (
                  <DateStringField
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="请选择归档日期"
                    disabled={readonly}
                  />
                )}
              />
            </div>
          </div>
        </FormSection>

        {/* ── 第四区：备考 ───────────────────────────────────── */}
        <FormSection title="备考">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 备考说明 */}
            <div className="md:col-span-2">
              <FieldLabel>备考说明</FieldLabel>
              <textarea
                {...form.register('remark')}
                rows={3}
                maxLength={500}
                placeholder="请输入备考说明（选填）"
                disabled={readonly}
                className={cn(
                  'w-full resize-y rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>

            {/* 备注 */}
            <div className="md:col-span-2">
              <FieldLabel>备注</FieldLabel>
              <textarea
                {...form.register('notes')}
                rows={3}
                maxLength={500}
                placeholder="请输入备注（选填）"
                disabled={readonly}
                className={cn(
                  'w-full resize-y rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
          </div>
        </FormSection>
      </form>

      {/* ── 底部操作栏 ───────────────────────────────────────── */}
      <BottomActionBar
        className={cn(
          'md:sticky md:bottom-4 md:mx-auto md:mt-4 md:max-w-[1100px] md:rounded-card md:border md:px-6 md:py-4'
        )}
      >
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1.5" />
            取消
          </Button>

          {!readonly && (
            <>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-[var(--color-bg-soft)] hover:text-primary-dark"
                loading={saveMutation.isPending}
                onClick={onSaveDraft}
              >
                <FolderCheck size={16} className="mr-1.5" />
                保存草稿
              </Button>
              <Button
                loading={submitMutation.isPending}
                onClick={onSubmitForReview}
                className="bg-gradient-to-r from-primary to-primary-dark hover:opacity-90"
              >
                提交审核
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </>
          )}
        </div>
      </BottomActionBar>
    </div>
  )
}
