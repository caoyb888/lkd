import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Download,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  List,
  RotateCcw,
  ChevronRight,
  Info,
  CalendarDays,
  Hash,
  BookOpen,
  FileUp,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { VolumeApi, type ImportResult } from '@/api/volume'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const STEPS = [
  { id: 1, title: '下载模板', mobileTitle: '下载模板' },
  { id: 2, title: '上传文件', mobileTitle: '上传文件' },
  { id: 3, title: '查看结果', mobileTitle: '查看结果' },
]

const TEMPLATE_FIELDS = [
  { field: 'volume_title', label: '案卷标题', required: true },
  { field: 'archive_no', label: '档号', required: true },
  { field: 'year', label: '年度', required: true },
  { field: 'fonds_no', label: '全宗号', required: true },
  { field: 'category_l1', label: '一级类目', required: true },
  { field: 'category_l2', label: '二级类目', required: false },
  { field: 'retention', label: '保管期限', required: true },
  { field: 'security_level', label: '密级', required: false },
  { field: 'copies', label: '份数', required: true },
  { field: 'compiler', label: '立卷人', required: false },
  { field: 'remark', label: '备注', required: false },
]

const TIPS = [
  {
    icon: <Hash size={15} className="text-blue-400" />,
    bg: 'bg-blue-500/15',
    text: '第 1 行为表头，数据从第 2 行开始填写',
  },
  {
    icon: <BookOpen size={15} className="text-amber-400" />,
    bg: 'bg-amber-500/15',
    text: '字典字段须填写实际值（如 internal），而非中文标签',
  },
  {
    icon: <CalendarDays size={15} className="text-emerald-400" />,
    bg: 'bg-emerald-500/15',
    text: '日期格式统一为 YYYY-MM-DD',
  },
  {
    icon: <Info size={15} className="text-primary" />,
    bg: 'bg-primary/5',
    text: '导入成功后记录状态初始化为待审核',
  },
]

/* ── 文件大小格式化 ─────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(2) + ' MB'
}

/* ── 提示卡片网格 ───────────────────────────────────────────── */
function TipsGrid() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {TIPS.map((tip, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-2.5 rounded-xl border border-[var(--color-border-light)] p-3',
            tip.bg
          )}
        >
          <span className="mt-0.5 shrink-0">{tip.icon}</span>
          <p className="text-xs leading-relaxed text-slate-body">{tip.text}</p>
        </div>
      ))}
    </div>
  )
}

/* ── 步骤指示器（电脑端） ───────────────────────────────────── */
function DesktopStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="hidden items-center justify-between md:flex">
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStep
        const isCompleted = step.id < currentStep
        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  isCompleted && 'bg-primary text-white',
                  isActive && 'border-2 border-primary bg-primary/10 text-primary',
                  !isActive && !isCompleted && 'border-2 border-[var(--color-border-light)] text-[var(--text-faint)]'
                )}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : step.id}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive && 'font-semibold text-primary',
                  isCompleted && 'text-slate-title',
                  !isActive && !isCompleted && 'text-[var(--text-faint)]'
                )}
              >
                {step.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-4 h-0.5 flex-1 rounded-full',
                  isCompleted ? 'bg-primary' : 'bg-[var(--color-bg-soft)]'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── 步骤指示器（手机端） ───────────────────────────────────── */
function MobileStepper({ currentStep }: { currentStep: number }) {
  const step = STEPS.find((s) => s.id === currentStep)
  return (
    <div className="flex items-center justify-between md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {currentStep}
        </span>
        <span className="text-sm font-medium text-slate-title">
          {step?.mobileTitle}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={cn(
              'h-1.5 rounded-full transition-all',
              s.id === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-[var(--color-bg-soft)]'
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function VolumeImportView() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  /* ── 下载模板 ─────────────────────────────────────────────── */
  const downloadMutation = useMutation({
    mutationFn: () => VolumeApi.downloadTemplate(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '案卷目录导入模板.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('模板下载成功')
    },
    onError: () => {
      toast.error('模板下载失败，请稍后重试')
    },
  })

  /* ── 导入 ─────────────────────────────────────────────────── */
  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return VolumeApi.importVolumes(fd)
    },
    onSuccess: (res) => {
      setImportResult(res)
      toast.success(`导入完成，成功导入 ${res.successCount} 条记录`)
      setStep(3)
    },
  })

  /* ── 文件处理 ─────────────────────────────────────────────── */
  function validateFile(file: File): boolean {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('只允许上传 .xlsx 格式的 Excel 文件，请重新选择')
      return false
    }
    if (file.size > MAX_SIZE) {
      toast.error('文件大小不能超过 10 MB')
      return false
    }
    return true
  }

  function pickFile(file: File) {
    if (!validateFile(file)) return
    setSelectedFile(file)
    setImportResult(null)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave() {
    setIsDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) pickFile(f)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
    e.target.value = ''
  }

  function clearFile() {
    setSelectedFile(null)
    setImportResult(null)
  }

  function resetAll() {
    setStep(1)
    setSelectedFile(null)
    setImportResult(null)
  }

  function handleImport() {
    if (!selectedFile) {
      toast.warning('请先选择要上传的文件')
      return
    }
    importMutation.mutate(selectedFile)
  }

  /* ── 步骤内容 ─────────────────────────────────────────────── */
  const stepContent = (
    <div className="mt-5">
      {/* ── Step 1: 下载模板 ───────────────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左列：下载操作 */}
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-lighter)] px-6 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <FileSpreadsheet size={28} className="text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-title">
                  案卷目录导入模板
                </h3>
                <p className="mt-1 text-sm text-slate-body">
                  请先下载模板，按规范填写数据后再上传
                </p>
              </div>
              <Button
                loading={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate()}
              >
                <Download size={16} className="mr-1.5" />
                下载导入模板
              </Button>
            </div>
            <TipsGrid />
          </div>

          {/* 右列：模板字段说明 */}
          <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-main)] shadow-card">
            <div className="border-b border-[var(--color-border-light)] px-4 py-3">
              <p className="text-sm font-semibold text-slate-title">模板字段说明</p>
              <p className="mt-0.5 text-xs text-[var(--text-faint)]">共 {TEMPLATE_FIELDS.length} 个字段，带 <span className="text-red-400">*</span> 为必填</p>
            </div>
            <div className="divide-y divide-[var(--color-border-light)]">
              {TEMPLATE_FIELDS.map((f) => (
                <div key={f.field} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[11px] text-slate-body">
                      {f.field}
                    </code>
                    <span className="text-sm text-slate-title">{f.label}</span>
                  </div>
                  {f.required ? (
                    <span className="text-xs font-medium text-red-400">必填</span>
                  ) : (
                    <span className="text-xs text-[var(--text-faint)]">可选</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: 上传文件 ───────────────────────────────── */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左列：上传区 */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={cn(
              'relative flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all',
              isDragging
                ? 'border-primary bg-[var(--color-bg-soft)]'
                : selectedFile
                  ? 'border-primary border-solid bg-gradient-to-br from-[var(--color-bg-soft)] to-[var(--color-bg-lighter)]'
                  : 'border-[var(--color-border-medium)] bg-[var(--color-bg-lighter)] hover:border-primary hover:bg-[var(--color-bg-soft)]',
              !selectedFile && 'cursor-pointer'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={onFileInput}
            />

            {!selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <Upload size={28} className="text-primary" />
                </div>
                <p className="text-base font-semibold text-slate-title">
                  拖拽文件到此处，或
                  <span className="ml-1 text-primary underline">点击选择</span>
                </p>
                <p className="text-xs text-[var(--text-faint)]">
                  支持 .xlsx 格式，最大 10 MB
                </p>
              </div>
            ) : (
              <div className="flex w-full items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <FileSpreadsheet size={24} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-slate-title">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[var(--text-faint)]">
                    {formatSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-[var(--text-faint)] hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            )}
          </div>

          {/* 右列：注意事项 */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-title">上传注意事项</p>
            <TipsGrid />
            <div className="rounded-xl border border-dashed border-[var(--color-border-medium)] bg-[var(--color-bg-lighter)] px-4 py-3 text-xs text-[var(--text-faint)]">
              如未下载模板，请先返回上一步获取标准格式文件
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: 查看结果 ───────────────────────────────── */}
      {step === 3 && importResult && (
        <div className="space-y-4">
          {/* 结果概览：数字卡片横排 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-main)] py-5 shadow-card">
              <p className="text-xs text-[var(--text-faint)]">读取总数</p>
              <p className="text-3xl font-bold text-slate-title">{importResult.totalCount}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-5 shadow-card">
              <p className="text-xs text-emerald-300">成功导入</p>
              <p className="text-3xl font-bold text-emerald-300">{importResult.successCount}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/15 py-5 shadow-card">
              <p className="text-xs text-red-400">失败记录</p>
              <p className="text-3xl font-bold text-red-400">
                {importResult.errorList?.length ?? 0}
              </p>
            </div>
          </div>

          {/* 结果摘要 */}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-3 shadow-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-title">导入完成</p>
              <p className="text-xs text-slate-body">
                文件 <strong>{importResult.fileName}</strong> 已处理完毕
              </p>
            </div>
          </div>

          {/* 错误列表 */}
          {importResult.errorList && importResult.errorList.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-main)] shadow-card">
              <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-4 py-3">
                <AlertCircle size={15} className="text-red-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-title">错误明细</p>
                  <p className="text-xs text-slate-body">
                    以下数据行导入失败，请修正后重新导入
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <tr className="bg-[var(--color-bg-lighter)]">
                      <TableHead className="w-20 text-center">行号</TableHead>
                      <TableHead className="w-32">列名</TableHead>
                      <TableHead>错误信息</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {importResult.errorList.map((err, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-300">
                            {err.row}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-xs text-slate-body">
                            {err.column}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-red-300">
                          {err.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  /* ── 底部操作栏 ───────────────────────────────────────────── */
  const footerButtons = (
    <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border-light)] pt-4">
      {step > 1 && step < 3 ? (
        <Button variant="outline" onClick={() => setStep(step - 1)}>
          <ArrowLeft size={16} className="mr-1.5" />
          上一步
        </Button>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        {step === 1 && (
          <Button onClick={() => setStep(2)} disabled={downloadMutation.isPending}>
            下一步
            <ArrowRight size={16} className="ml-1.5" />
          </Button>
        )}

        {step === 2 && (
          <>
            <Button variant="outline" onClick={() => navigate('/volume/list')}>
              取消
            </Button>
            <Button
              loading={importMutation.isPending}
              disabled={!selectedFile}
              onClick={handleImport}
            >
              <Upload size={16} className="mr-1.5" />
              开始导入
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <Button variant="outline" onClick={resetAll}>
              <RotateCcw size={16} className="mr-1.5" />
              继续导入
            </Button>
            <Button onClick={() => navigate('/volume/list')}>
              <List size={16} className="mr-1.5" />
              前往案卷列表
            </Button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-[960px] p-3 md:p-5">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <FileUp size={20} className="text-primary-dark" />
            Excel 批量导入
          </span>
        }
      />

      {/* 步骤指示器 */}
      <div className="mb-4 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-5 py-3.5 shadow-card">
        <DesktopStepper currentStep={step} />
        <MobileStepper currentStep={step} />
      </div>

      {/* 步骤内容 */}
      <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card md:p-5">
        <div className="flex items-center gap-2 md:hidden">
          <span className="text-sm font-semibold text-slate-title">
            {STEPS.find((s) => s.id === step)?.title}
          </span>
          <ChevronRight size={14} className="text-[var(--text-faint)]" />
        </div>

        {stepContent}
        {footerButtons}
      </div>
    </div>
  )
}
