import { useState, useMemo, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  GripVertical,
  Loader2,
  Trash2,
  Edit3,
  X,
  Folder,
  Lock,
  ArrowLeft,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
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
  TableHead,
  TableCell,
} from '@/components/ui/table'
import StatusTag from '@/components/StatusTag'
import EmptyState from '@/components/EmptyState'
import { VolumeApi } from '@/api/volume'
import { FileApi, type ArchiveFileSaveDTO } from '@/api/file'
import { useAuthStore } from '@/stores/authStore'
import { useDictStore } from '@/stores/dictStore'
import type { ArchiveFileListVO } from '@/types/vo'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

/* ── 常量 ───────────────────────────────────────────────────── */
const SECURITY_CLASS: Record<string, string> = {
  public: 'bg-green-500/15 text-green-300',
  internal: 'bg-blue-500/15 text-blue-300',
  secret: 'bg-yellow-500/15 text-yellow-300',
  confidential: 'bg-orange-500/15 text-orange-300',
  topsecret: 'bg-red-500/15 text-red-300',
}

/* ── Zod 校验 ───────────────────────────────────────────────── */
const fileSchema = z.object({
  fileTitle: z.string().min(1, '请输入文件标题'),
  seqNo: z.number().min(1, '顺序号最小为 1'),
  fileNo: z.string().optional(),
  responsible: z.string().optional(),
  pages: z.number().optional(),
  securityLevel: z.string().optional(),
  archiveDate: z.string().optional(),
  keywords: z.string().optional(),
  originalPath: z.string().optional(),
  remark: z.string().optional(),
})

type FileFormData = z.infer<typeof fileSchema>

/* ── 主题词 Tag 输入组件 ────────────────────────────────────── */
function KeywordInput({
  value,
  onChange,
}: {
  value?: string
  onChange: (v: string) => void
}) {
  const [input, setInput] = useState('')
  const tags = useMemo(() => {
    if (!value) return []
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }, [value])

  function addTag() {
    const kw = input.trim()
    if (!kw) return
    if (!tags.includes(kw)) {
      onChange([...tags, kw].join(','))
    }
    setInput('')
  }

  function removeTag(kw: string) {
    onChange(tags.filter((t) => t !== kw).join(','))
  }

  return (
    <div>
      <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-btn border border-[var(--color-border-light)] p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-tag bg-[var(--color-bg-soft)] px-2 py-0.5 text-xs font-medium text-primary-dark"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex rounded-full p-0.5 hover:bg-primary/10"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder={tags.length === 0 ? '输入后按 Enter 添加' : ''}
          className="min-w-[100px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[var(--text-faint)]"
        />
      </div>
      <p className="mt-1 text-[11px] text-[var(--text-faint)]">
        多个主题词逐个添加，点击标签右侧 × 删除
      </p>
    </div>
  )
}

/* ── 日期字符串字段 ─────────────────────────────────────────── */
function DateStringField({
  value,
  onChange,
  placeholder,
}: {
  value?: string
  onChange: (v?: string) => void
  placeholder?: string
}) {
  const date = value ? parseISO(value) : undefined
  return (
    <DatePicker
      value={date}
      onChange={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
      placeholder={placeholder}
    />
  )
}

/* ── 可拖拽表格行 ───────────────────────────────────────────── */
function SortableTableRow({
  file,
  canEdit,
  onEdit,
  onDelete,
}: {
  file: ArchiveFileListVO
  canEdit: boolean
  onEdit: (f: ArchiveFileListVO) => void
  onDelete: (f: ArchiveFileListVO) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.recordId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-b border-[var(--color-border-light)] transition-colors',
        isDragging && 'bg-primary/5 opacity-60',
        !isDragging && 'hover:bg-[var(--color-bg-soft)]'
      )}
    >
      {canEdit && (
        <TableCell className="w-11 px-2 text-center">
          <div
            {...attributes}
            {...listeners}
            className="inline-flex cursor-grab text-[var(--text-faint)] hover:text-primary active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </div>
        </TableCell>
      )}
      <TableCell className="text-center">{file.seqNo}</TableCell>
      <TableCell>
        <span className="text-xs text-slate-body">{file.fileNo || '—'}</span>
      </TableCell>
      <TableCell>
        <span className="font-medium text-slate-title">{file.fileTitle}</span>
      </TableCell>
      <TableCell>{file.responsible || '—'}</TableCell>
      <TableCell className="text-center">{file.pages ?? '—'}</TableCell>
      <TableCell className="text-center">
        {file.securityLevel ? (
          <span
            className={cn(
              'inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-semibold',
              SECURITY_CLASS[file.securityLevel] ?? 'bg-[var(--color-bg-soft)] text-slate-body'
            )}
          >
            {file.securityLevelLabel || file.securityLevel}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs text-slate-body">{file.keywords || '—'}</span>
      </TableCell>
      <TableCell className="text-center">{file.archiveDate || '—'}</TableCell>
      <TableCell>
        {canEdit ? (
          <div className="flex items-center gap-1">
            <Button
              variant="link"
              size="sm"
              className="h-7 px-1.5 text-primary"
              onClick={() => onEdit(file)}
            >
              <Edit3 size={13} className="mr-0.5" />
              编辑
            </Button>
            <Button
              variant="link"
              size="sm"
              className="h-7 px-1.5 text-red-400"
              onClick={() => onDelete(file)}
            >
              <Trash2 size={13} className="mr-0.5" />
              删除
            </Button>
          </div>
        ) : (
          <span className="text-[var(--text-faint)]">—</span>
        )}
      </TableCell>
    </tr>
  )
}

/* ── 可拖拽卡片 ─────────────────────────────────────────────── */
function SortableCard({
  file,
  canEdit,
  onEdit,
  onDelete,
}: {
  file: ArchiveFileListVO
  canEdit: boolean
  onEdit: (f: ArchiveFileListVO) => void
  onDelete: (f: ArchiveFileListVO) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.recordId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, contain: 'layout paint' }}
      className={cn(
        'rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card',
        isDragging && 'opacity-60 ring-2 ring-primary/30'
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {canEdit && (
            <div
              {...attributes}
              {...listeners}
              className="shrink-0 cursor-grab text-[var(--text-faint)] hover:text-primary active:cursor-grabbing"
            >
              <GripVertical size={18} />
            </div>
          )}
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {file.seqNo}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-title">
              {file.fileTitle}
            </div>
            <div className="text-xs text-[var(--text-faint)]">
              {file.fileNo || '无编号'}
            </div>
          </div>
        </div>
        {file.securityLevel && (
          <span
            className={cn(
              'shrink-0 rounded-tag px-2 py-0.5 text-[10px] font-semibold',
              SECURITY_CLASS[file.securityLevel] ?? 'bg-[var(--color-bg-soft)] text-slate-body'
            )}
          >
            {file.securityLevelLabel || file.securityLevel}
          </span>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-body">
        <div className="flex justify-between">
          <span className="text-[var(--text-faint)]">责任者</span>
          <span>{file.responsible || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-faint)]">页数</span>
          <span>{file.pages ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-faint)]">主题词</span>
          <span className="truncate text-right">{file.keywords || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-faint)]">归档日期</span>
          <span>{file.archiveDate || '—'}</span>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-2.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => onEdit(file)}
          >
            <Edit3 size={13} className="mr-1" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/15"
            onClick={() => onDelete(file)}
          >
            <Trash2 size={13} className="mr-1" />
            删除
          </Button>
        </div>
      )}
    </div>
  )
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function FileListView() {
  // 注意：volumeId 路由参数实际接收的是案卷 recordId（主键），而非 volumeNo
  const { volumeId } = useParams<{ volumeId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const dictStore = useDictStore()

  const vid = Number(volumeId)
  const yearFromQuery = searchParams.get('year') ?? undefined

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<ArchiveFileListVO | null>(null)
  const [sortSaving, setSortSaving] = useState(false)

  const isEdit = !!editingFile

  /* ── 字典 ─────────────────────────────────────────────────── */
  const securityOptions = dictStore.getItems('security_level')

  /* ── 案卷详情 ─────────────────────────────────────────────── */
  const { data: volume, isLoading: volLoading } = useQuery({
    queryKey: ['volume', 'detail-for-file', vid, yearFromQuery],
    queryFn: async () => {
      if (yearFromQuery) {
        return VolumeApi.detail(vid, yearFromQuery)
      }
      const pageRes = await VolumeApi.page({
        current: 1,
        size: 1,
        keyword: String(vid),
      })
      const found = pageRes.records[0]
      if (!found) return null
      return VolumeApi.detail(vid, found.year)
    },
    enabled: !!vid,
  })

  const isDraft = volume?.status === 0
  const canEdit =
    isDraft &&
    (authStore.isAdmin ||
      (volume?.compilerId != null &&
        volume.compilerId === authStore.userInfo?.userId))

  /* ── 文件列表 ─────────────────────────────────────────────── */
  const {
    data: files,
    isLoading: filesLoading,
  } = useQuery({
    queryKey: ['file', 'list', volume?.volumeNo, volume?.year],
    queryFn: () => {
      if (!volume?.volumeNo || !volume?.year) return []
      return FileApi.listByVolume(volume.volumeNo, volume.year)
    },
    enabled: !!volume?.volumeNo && !!volume?.year,
  })

  const fileList = files ?? []

  /* ── 拖拽传感器 ───────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /* ── 拖拽排序 ─────────────────────────────────────────────── */
  const sortMutation = useMutation({
    mutationFn: (items: { recordId: number; year: string; seqNo: number }[]) =>
      FileApi.batchSort(items),
    onSuccess: () => {
      toast.success('排序已保存')
      queryClient.invalidateQueries({ queryKey: ['file', 'list'] })
    },
    onError: () => {
      toast.error('排序保存失败，已回滚')
      queryClient.invalidateQueries({ queryKey: ['file', 'list'] })
    },
    onSettled: () => {
      setSortSaving(false)
    },
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!canEdit) return

    const oldIndex = fileList.findIndex((f) => f.recordId === active.id)
    const newIndex = fileList.findIndex((f) => f.recordId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(fileList, oldIndex, newIndex).map((f, i) => ({
      ...f,
      seqNo: i + 1,
    }))

    setSortSaving(true)
    queryClient.setQueryData(
      ['file', 'list', volume?.volumeNo, volume?.year],
      reordered
    )

    sortMutation.mutate(
      reordered.map((f) => ({
        recordId: f.recordId,
        year: f.year,
        seqNo: f.seqNo,
      }))
    )
  }

  /* ── 表单 ─────────────────────────────────────────────────── */
  const form = useForm<FileFormData>({
    resolver: zodResolver(fileSchema),
    defaultValues: {
      fileTitle: '',
      seqNo: 1,
      fileNo: '',
      responsible: '',
      pages: undefined,
      securityLevel: '',
      archiveDate: '',
      keywords: '',
      originalPath: '',
      remark: '',
    },
  })

  useEffect(() => {
    if (!drawerOpen) {
      form.reset()
    }
  }, [drawerOpen, form])

  /* ── 变更操作 ─────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async (payload: ArchiveFileSaveDTO) => {
      if (isEdit && editingFile) {
        await FileApi.update(editingFile.recordId, editingFile.year, payload)
      } else {
        await FileApi.save(payload)
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? '文件信息已更新' : '文件已新建')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['file', 'list'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, year }: { id: number; year: string }) =>
      FileApi.delete(id, year),
    onSuccess: () => {
      toast.success('已删除')
      queryClient.invalidateQueries({ queryKey: ['file', 'list'] })
    },
  })

  function openCreate() {
    setEditingFile(null)
    form.reset({
      fileTitle: '',
      seqNo: fileList.length + 1,
      fileNo: '',
      responsible: '',
      pages: undefined,
      securityLevel: '',
      archiveDate: '',
      keywords: '',
      originalPath: '',
      remark: '',
    })
    setDrawerOpen(true)
  }

  function openEdit(file: ArchiveFileListVO) {
    setEditingFile(file)
    form.reset({
      fileTitle: file.fileTitle,
      seqNo: file.seqNo,
      fileNo: file.fileNo ?? '',
      responsible: file.responsible ?? '',
      pages: file.pages || undefined,
      securityLevel: file.securityLevel ?? '',
      archiveDate: file.archiveDate ?? '',
      keywords: file.keywords ?? '',
      originalPath: file.originalPath ?? '',
      remark: file.remark ?? '',
    })
    setDrawerOpen(true)
  }

  function handleDelete(file: ArchiveFileListVO) {
    if (!window.confirm(`确认删除文件「${file.fileTitle}」？此操作不可撤销。`))
      return
    deleteMutation.mutate({ id: file.recordId, year: file.year })
  }

  function onDrawerSubmit(data: FileFormData) {
    if (!volume) return
    const payload: ArchiveFileSaveDTO = {
      volumeId: vid,
      year: volume.year,
      seqNo: data.seqNo,
      fileNo: data.fileNo || undefined,
      fileTitle: data.fileTitle,
      responsible: data.responsible || undefined,
      pages: data.pages || undefined,
      securityLevel: data.securityLevel || undefined,
      archiveDate: data.archiveDate || undefined,
      keywords: data.keywords || undefined,
      originalPath: data.originalPath || undefined,
      remark: data.remark || undefined,
    }
    saveMutation.mutate(payload)
  }

  /* ── 加载态 ───────────────────────────────────────────────── */
  if (volLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="mt-3 text-sm text-slate-body">加载案卷数据中…</p>
      </div>
    )
  }

  if (!volume) {
    return (
      <div>
        <div className="mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </div>
        <PageHeader title="卷内文件目录" />
        <EmptyState description="未找到关联案卷，请返回列表重新选择" />
      </div>
    )
  }

  return (
    <div className="pb-24 md:pb-6">
      {/* ── 页头 ─────────────────────────────────────────────── */}
      <div className="mb-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </button>
      </div>
      <PageHeader title="卷内文件目录" />

      {/* ── 关联案卷横幅 ─────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card">
        <Folder size={24} className="shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs font-semibold text-primary-dark">
            {volume.archiveNo}
          </div>
          <div className="truncate text-sm font-medium text-slate-title">
            {volume.volumeTitle}
          </div>
        </div>
        <StatusTag type="archive" value={volume.status} />
        {!isDraft && (
          <span className="hidden items-center gap-1 rounded-tag bg-[var(--color-bg-soft)] px-2 py-0.5 text-xs text-slate-body sm:inline-flex">
            <Lock size={10} />
            只读
          </span>
        )}
      </div>

      {/* ── 工具栏 ─────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-body">
          共 <strong className="text-slate-title">{fileList.length}</strong> 份文件
          {sortSaving && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
              <Loader2 size={12} className="animate-spin" />
              保存排序…
            </span>
          )}
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            新建文件
          </Button>
        )}
      </div>

      {/* ── DndContext 包裹列表 ───────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fileList.map((f) => f.recordId)}
          strategy={verticalListSortingStrategy}
        >
          {/* ── 电脑端表格 ─────────────────────────────────────── */}
          <div className="hidden overflow-auto rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] shadow-card md:block">
            {filesLoading ? (
              <div className="space-y-3 p-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-bg-soft)]" />
                ))}
              </div>
            ) : fileList.length === 0 ? (
              <div className="py-12">
                <EmptyState description="暂无卷内文件，点击「新建文件」开始录入" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <tr className="bg-[var(--color-bg-lighter)]">
                    {canEdit && (
                      <TableHead className="w-11 px-2 text-center"> </TableHead>
                    )}
                    <TableHead className="text-center">顺序号</TableHead>
                    <TableHead>文件编号</TableHead>
                    <TableHead>文件标题</TableHead>
                    <TableHead>责任者</TableHead>
                    <TableHead className="text-center">页数</TableHead>
                    <TableHead className="text-center">密级</TableHead>
                    <TableHead>主题词</TableHead>
                    <TableHead className="text-center">归档日期</TableHead>
                    <TableHead>操作</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {fileList.map((file) => (
                    <SortableTableRow
                      key={file.recordId}
                      file={file}
                      canEdit={canEdit}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* ── 手机端卡片列表 ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))
            ) : fileList.length === 0 ? (
              <EmptyState description="暂无卷内文件，点击「新建文件」开始录入" />
            ) : (
              fileList.map((file) => (
                <SortableCard
                  key={file.recordId}
                  file={file}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* ── 新建/编辑 Drawer ─────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? '编辑卷内文件' : '新建卷内文件'}</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>
            <form
              id="file-form"
              onSubmit={form.handleSubmit(onDrawerSubmit)}
              className="space-y-4"
            >
              {/* 关联案卷号（只读） */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  关联案卷号
                </label>
                <Input value={volume.archiveNo} disabled />
              </div>

              {/* 顺序号 + 文件编号 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    顺序号
                  </label>
                  <Controller
                    name="seqNo"
                    control={form.control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value}
                        onChange={field.onChange}
                        min={1}
                        max={9999}
                      />
                    )}
                  />
                  {form.formState.errors.seqNo && (
                    <p className="mt-1 text-xs text-red-400">
                      {form.formState.errors.seqNo.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    文件编号
                  </label>
                  <Input
                    {...form.register('fileNo')}
                    placeholder="可选"
                  />
                </div>
              </div>

              {/* 文件标题 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  文件标题 <span className="text-red-400">*</span>
                </label>
                <Input
                  {...form.register('fileTitle')}
                  placeholder="请输入文件标题（必填）"
                  maxLength={200}
                />
                {form.formState.errors.fileTitle && (
                  <p className="mt-1 text-xs text-red-400">
                    {form.formState.errors.fileTitle.message}
                  </p>
                )}
              </div>

              {/* 责任者 + 页数 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    责任者
                  </label>
                  <Input
                    {...form.register('responsible')}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    页数
                  </label>
                  <Controller
                    name="pages"
                    control={form.control}
                    render={({ field }) => (
                      <NumberInput
                        value={field.value ?? 0}
                        onChange={field.onChange}
                        min={0}
                        max={99999}
                      />
                    )}
                  />
                </div>
              </div>

              {/* 密级 + 归档日期 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    密级
                  </label>
                  <Controller
                    name="securityLevel"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择密级" />
                        </SelectTrigger>
                        <SelectContent>
                          {securityOptions.map((item) => (
                            <SelectItem
                              key={item.itemValue}
                              value={item.itemValue}
                            >
                              {item.itemLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-body">
                    归档日期
                  </label>
                  <Controller
                    name="archiveDate"
                    control={form.control}
                    render={({ field }) => (
                      <DateStringField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="请选择归档日期"
                      />
                    )}
                  />
                </div>
              </div>

              {/* 主题词 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  主题词
                </label>
                <Controller
                  name="keywords"
                  control={form.control}
                  render={({ field }) => (
                    <KeywordInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* 原文路径 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  原文路径
                </label>
                <Input
                  {...form.register('originalPath')}
                  placeholder="电子原文存储路径（可选）"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-body">
                  备注
                </label>
                <textarea
                  {...form.register('remark')}
                  rows={3}
                  maxLength={500}
                  placeholder="可选"
                  className="w-full resize-y rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button
              loading={saveMutation.isPending}
              onClick={form.handleSubmit(onDrawerSubmit)}
            >
              {isEdit ? '保存修改' : '新建文件'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
