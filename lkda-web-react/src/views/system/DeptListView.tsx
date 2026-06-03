import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
  FolderPlus,
  Edit3,
  Trash2,
  GripVertical,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import EmptyState from '@/components/EmptyState'
import { DeptApi } from '@/api/system/dept'
import type { DeptVO } from '@/types/vo'
import { cn } from '@/lib/utils'

/* ── 表单校验 ───────────────────────────────────────────────── */
const deptSchema = z.object({
  deptName: z
    .string()
    .min(1, '请输入部门名称')
    .max(50, '不超过 50 个字符'),
  sortOrder: z.number({ message: '请输入排序编号' }).min(1).max(999),
})

type DeptFormData = z.infer<typeof deptSchema>

/* ── 辅助函数 ───────────────────────────────────────────────── */
function findParent(tree: DeptVO[], deptId: number): DeptVO | null {
  for (const n of tree) {
    if (n.children?.some((c) => c.deptId === deptId)) return n
    if (n.children?.length) {
      const found = findParent(n.children, deptId)
      if (found) return found
    }
  }
  return null
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function DeptListView() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<DeptVO | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // 弹窗状态
  const [addOpen, setAddOpen] = useState(false)
  const [addParentId, setAddParentId] = useState(0)
  const [addParentName, setAddParentName] = useState('（顶层）')
  const [editOpen, setEditOpen] = useState(false)
  const [editNode, setEditNode] = useState<DeptVO | null>(null)

  // 拖拽状态
  const [dragNode, setDragNode] = useState<DeptVO | null>(null)
  const [dragOverNode, setDragOverNode] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(
    null
  )

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: treeData, isLoading } = useQuery({
    queryKey: ['dept', 'tree'],
    queryFn: () => DeptApi.tree(),
  })

  // 默认展开所有有子节点的部门
  useEffect(() => {
    if (!treeData) return
    const ids = new Set<number>()
    function walk(nodes: DeptVO[]) {
      for (const n of nodes) {
        if (n.children?.length) {
          ids.add(n.deptId)
          walk(n.children)
        }
      }
    }
    walk(treeData)
    setExpanded(ids)
  }, [treeData])

  /* ── 计算属性 ─────────────────────────────────────────────── */
  const isLeaf = useMemo(
    () => !selected?.children?.length,
    [selected]
  )

  const parentNode = useMemo(() => {
    if (!selected || !treeData) return null
    return findParent(treeData, selected.deptId)
  }, [selected, treeData])

  /* ── 变更操作 ─────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: DeptApi.save,
    onSuccess: () => {
      toast.success('部门创建成功')
      setAddOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dept', 'tree'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      deptId,
      data,
    }: {
      deptId: number
      data: Parameters<typeof DeptApi.update>[1]
    }) => DeptApi.update(deptId, data),
    onSuccess: () => {
      toast.success('部门信息已更新')
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dept', 'tree'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: DeptApi.delete,
    onSuccess: () => {
      toast.success('部门已删除')
      setSelected(null)
      setMobileDetailOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dept', 'tree'] })
    },
  })

  /* ── 表单 ─────────────────────────────────────────────────── */
  const addForm = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
    defaultValues: { deptName: '', sortOrder: 1 },
  })

  const editForm = useForm<DeptFormData>({
    resolver: zodResolver(deptSchema),
    defaultValues: { deptName: '', sortOrder: 1 },
  })

  /* ── 事件处理 ─────────────────────────────────────────────── */
  function handleSelect(node: DeptVO) {
    setSelected(node)
    setMobileDetailOpen(true)
  }

  function toggleExpand(deptId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(deptId)) next.delete(deptId)
      else next.add(deptId)
      return next
    })
  }

  function openAddRoot() {
    setAddParentId(0)
    setAddParentName('（顶层）')
    const rootCount = treeData?.length ?? 0
    addForm.reset({ deptName: '', sortOrder: rootCount + 1 })
    setAddOpen(true)
  }

  function openAddChild() {
    if (!selected) return
    setAddParentId(selected.deptId)
    setAddParentName(selected.deptName)
    const childCount = selected.children?.length ?? 0
    addForm.reset({ deptName: '', sortOrder: childCount + 1 })
    setAddOpen(true)
    setMobileDetailOpen(false)
  }

  function openEdit() {
    if (!selected) return
    setEditNode(selected)
    editForm.reset({
      deptName: selected.deptName,
      sortOrder: selected.sortOrder,
    })
    setEditOpen(true)
    setMobileDetailOpen(false)
  }

  function handleDelete() {
    if (!selected) return
    if (!isLeaf) {
      toast.warning('请先删除该部门下的所有子部门')
      return
    }
    if (
      !window.confirm(
        `确定要删除部门「${selected.deptName}」吗？删除后不可恢复。`
      )
    )
      return
    deleteMutation.mutate(selected.deptId)
  }

  function onAddSubmit(data: DeptFormData) {
    saveMutation.mutate({
      deptName: data.deptName,
      parentId: addParentId,
      sortOrder: data.sortOrder,
    })
  }

  function onEditSubmit(data: DeptFormData) {
    if (!editNode) return
    updateMutation.mutate({
      deptId: editNode.deptId,
      data: {
        deptName: data.deptName,
        parentId: editNode.parentId,
        sortOrder: data.sortOrder,
      },
    })
  }

  /* ── 拖拽排序（电脑端） ───────────────────────────────────── */
  function handleDragStart(node: DeptVO) {
    setDragNode(node)
  }

  function handleDragOver(e: React.DragEvent, node: DeptVO) {
    e.preventDefault()
    if (!dragNode || dragNode.deptId === node.deptId) return
    if (dragNode.parentId !== node.parentId) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'before' : 'after'
    setDragOverNode(node.deptId)
    setDragPosition(position)
  }

  function handleDragLeave() {
    setDragOverNode(null)
    setDragPosition(null)
  }

  async function handleDrop(targetNode: DeptVO) {
    if (!dragNode || !treeData) {
      setDragNode(null)
      setDragOverNode(null)
      setDragPosition(null)
      return
    }
    if (dragNode.parentId !== targetNode.parentId) {
      setDragNode(null)
      setDragOverNode(null)
      setDragPosition(null)
      return
    }

    const parent = findParent(treeData, dragNode.deptId)
    const siblings = parent ? parent.children! : [...treeData]
    const filtered = siblings.filter((n) => n.deptId !== dragNode.deptId)
    const targetIndex = filtered.findIndex(
      (n) => n.deptId === targetNode.deptId
    )
    const insertIndex =
      dragPosition === 'after' ? targetIndex + 1 : targetIndex
    const newSortOrder = insertIndex + 1

    setDragNode(null)
    setDragOverNode(null)
    setDragPosition(null)

    try {
      await DeptApi.update(dragNode.deptId, {
        deptName: dragNode.deptName,
        parentId: dragNode.parentId,
        sortOrder: newSortOrder,
      })
      toast.success('排序已更新')
      queryClient.invalidateQueries({ queryKey: ['dept', 'tree'] })
    } catch {
      // 失败时由响应拦截器统一提示
    }
  }

  /* ── 树节点渲染（电脑端） ─────────────────────────────────── */
  function renderTreeNodes(nodes: DeptVO[], level: number) {
    return nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0
      const isExpanded = expanded.has(node.deptId)
      const isSelected = selected?.deptId === node.deptId
      const isDragOver = dragOverNode === node.deptId

      return (
        <div key={node.deptId}>
          <div
            className={cn(
              'group relative flex items-center gap-1.5 rounded-lg px-3 py-2 cursor-pointer transition-colors select-none',
              isSelected
                ? 'bg-primary text-white'
                : 'hover:bg-[var(--color-bg-soft)] text-slate-title'
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            draggable
            onDragStart={() => handleDragStart(node)}
            onDragOver={(e) => handleDragOver(e, node)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(node)}
            onClick={() => handleSelect(node)}
          >
            {/* 拖拽指示线 */}
            {isDragOver && dragPosition === 'before' && (
              <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
            {isDragOver && dragPosition === 'after' && (
              <div className="absolute -bottom-0.5 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}

            {/* 展开/折叠 */}
            {hasChildren ? (
              <span
                className={cn(
                  'shrink-0 transition-transform',
                  isSelected ? 'text-white/80' : 'text-slate-400'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(node.deptId)
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
            ) : (
              <span className="w-[14px] shrink-0" />
            )}

            {/* 图标 */}
            <span
              className={cn(
                'shrink-0',
                isSelected ? 'text-white' : 'text-primary'
              )}
            >
              {hasChildren ? (
                <FolderOpen size={15} />
              ) : (
                <FileText size={14} />
              )}
            </span>

            {/* 名称 */}
            <span
              className={cn(
                'flex-1 truncate text-sm',
                isSelected && 'font-semibold'
              )}
            >
              {node.deptName}
            </span>

            {/* 子部门数 */}
            {hasChildren && (
              <span
                className={cn(
                  'shrink-0 rounded-tag px-1.5 py-0.5 text-[10px] font-semibold',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-primary/10 text-primary'
                )}
              >
                {node.children!.length}
              </span>
            )}

            {/* 拖拽手柄 */}
            <span
              className={cn(
                'shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity',
                isSelected ? 'text-white/60' : 'text-slate-300'
              )}
            >
              <GripVertical size={14} />
            </span>
          </div>

          {/* 子节点 */}
          {hasChildren && isExpanded && (
            <div>{renderTreeNodes(node.children!, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  /* ── 手机端列表渲染 ───────────────────────────────────────── */
  function renderMobileItems(nodes: DeptVO[], level: number) {
    return nodes.map((node) => {
      const hasChildren = (node.children?.length ?? 0) > 0
      const isExpanded = expanded.has(node.deptId)

      return (
        <div key={node.deptId}>
          <div
            className="flex items-center gap-2 border-b border-[var(--color-border-light)] px-4 py-3"
            style={{ paddingLeft: `${16 + level * 20}px` }}
            onClick={() => handleSelect(node)}
          >
            {hasChildren && (
              <span
                className="shrink-0 text-slate-400"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(node.deptId)
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </span>
            )}
            <span className="shrink-0 text-primary">
              {hasChildren ? (
                <FolderOpen size={16} />
              ) : (
                <FileText size={14} />
              )}
            </span>
            <span className="flex-1 truncate text-sm text-slate-title">
              {node.deptName}
            </span>
            {hasChildren && (
              <span className="shrink-0 rounded-tag bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {node.children!.length}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div>{renderMobileItems(node.children!, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  /* ── 详情面板内容（复用） ─────────────────────────────────── */
  const DetailContent = ({ inDrawer = false }: { inDrawer?: boolean }) => {
    if (!selected) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <Building2 size={28} className="text-primary-dark" />
          </div>
          <p className="text-base font-semibold text-slate-title">
            请在左侧选择部门节点
          </p>
          <p className="mt-1 text-sm text-slate-400">
            选中节点后可查看详情、新增子部门、编辑或删除
          </p>
          <Button className="mt-4" onClick={openAddRoot}>
            <Plus size={16} />
            新增根部门
          </Button>
        </div>
      )
    }

    return (
      <div>
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-title">
            <Building2 size={20} className="text-primary" />
            {selected.deptName}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span>{parentNode?.deptName ?? '顶层部门'}</span>
            {parentNode && (
              <>
                <ChevronRight size={12} />
                <span className="font-semibold text-primary">
                  {selected.deptName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 信息网格 */}
        <div
          className={cn(
            'mb-5 grid gap-3',
            inDrawer ? 'grid-cols-2' : 'grid-cols-2'
          )}
        >
          <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] p-3">
            <div className="text-[11px] text-slate-400">部门名称</div>
            <div className="mt-1 text-sm font-semibold text-slate-title">
              {selected.deptName}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] p-3">
            <div className="text-[11px] text-slate-400">上级部门</div>
            <div className="mt-1 text-sm font-semibold text-slate-title">
              {parentNode?.deptName ?? '—（顶层）'}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] p-3">
            <div className="text-[11px] text-slate-400">排序编号</div>
            <div className="mt-1 text-sm font-semibold text-slate-title">
              {selected.sortOrder}
            </div>
          </div>
          {!inDrawer && (
            <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] p-3">
              <div className="text-[11px] text-slate-400">子部门数</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                {selected.children?.length ?? 0}
              </div>
            </div>
          )}
        </div>

        {/* 操作区 */}
        <div className="mb-5">
          <div className="mb-2 pl-0.5 text-xs font-semibold tracking-wide text-slate-400">
            操作
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="flex items-center gap-3.5 rounded-xl border border-[var(--color-border-light)] p-3 text-left transition-all hover:border-[var(--color-border-medium)] hover:bg-[var(--color-bg-soft)] hover:translate-x-0.5 active:scale-[0.99]"
              onClick={openAddChild}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-green-50">
                <FolderPlus size={16} className="text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-title">
                  新增子部门
                </div>
                <div className="text-[11px] text-slate-400">
                  在「{selected.deptName}」下添加
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button
              className="flex items-center gap-3.5 rounded-xl border border-[var(--color-border-light)] p-3 text-left transition-all hover:border-[var(--color-border-medium)] hover:bg-[var(--color-bg-soft)] hover:translate-x-0.5 active:scale-[0.99]"
              onClick={openEdit}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50">
                <Edit3 size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-title">
                  编辑部门
                </div>
                <div className="text-[11px] text-slate-400">
                  修改名称和排序编号
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300" />
            </button>

            <button
              className={cn(
                'flex items-center gap-3.5 rounded-xl border p-3 text-left transition-all',
                isLeaf
                  ? 'border-[var(--color-border-light)] hover:border-[var(--color-border-medium)] hover:bg-[var(--color-bg-soft)] hover:translate-x-0.5 active:scale-[0.99]'
                  : 'cursor-not-allowed opacity-50 border-[var(--color-border-light)]'
              )}
              onClick={isLeaf ? handleDelete : undefined}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-50">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-title">
                  删除部门
                </div>
                <div className="text-[11px] text-slate-400">
                  {isLeaf
                    ? '无子部门时可删除'
                    : '请先删除所有子部门'}
                </div>
              </div>
              {isLeaf ? (
                <ChevronRight size={14} className="text-slate-300" />
              ) : (
                <span className="shrink-0 rounded-tag border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
                  不可删除
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 拖拽提示（仅电脑端） */}
        {!inDrawer && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border-light)] bg-[var(--color-bg-lighter)] px-3 py-2 text-[11px] text-slate-400">
            <GripVertical size={14} className="text-slate-300" />
            可在左侧树中拖拽节点调整同级顺序
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={<span className="inline-flex items-center gap-2"><Building2 size={20} className="text-primary-dark" />部门管理</span>} />

      {/* ── 电脑端：左树右表 ────────────────────────────────── */}
      <div className="hidden lg:flex gap-3 items-start">
        {/* 左侧树面板 */}
        <div className="w-[300px] shrink-0 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-title">
              <Building2 size={16} className="text-primary" />
              部门层级
            </span>
            <div className="flex gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={openAddRoot}
              >
                <Plus size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['dept', 'tree'],
                  })
                }
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>
          <div className="p-1 min-h-[280px]">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ) : !treeData || treeData.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <Building2 size={36} className="mb-2 text-slate-300" />
                <p className="text-sm mb-3">暂无部门数据</p>
                <Button size="sm" onClick={openAddRoot}>
                  <Plus size={14} /> 新增根部门
                </Button>
              </div>
            ) : (
              treeData.map((node) => renderTreeNodes([node], 0))
            )}
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-5 min-h-[360px]">
          <DetailContent />
        </div>
      </div>

      {/* ── 手机端：Accordion + 底部 Drawer ─────────────────── */}
      <div className="lg:hidden">
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-title">
              <Building2 size={16} className="text-primary" />
              部门层级
            </span>
            <Button size="sm" onClick={openAddRoot}>
              <Plus size={14} /> 新增根部门
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          ) : !treeData || treeData.length === 0 ? (
            <EmptyState description="暂无部门数据" />
          ) : (
            renderMobileItems(treeData, 0)
          )}
        </div>

        {/* 手机端详情 Dialog */}
        <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>部门详情</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              <DetailContent inDrawer />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMobileDetailOpen(false)}
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── 新增弹窗 ─────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addParentId === 0
                ? '新增根部门'
                : `新增子部门 · ${addParentName}`}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(onAddSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                上级部门
              </label>
              <Input value={addParentName} disabled />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                部门名称
              </label>
              <Input
                {...addForm.register('deptName')}
                placeholder="请输入部门名称"
                autoFocus
              />
              {addForm.formState.errors.deptName && (
                <p className="mt-1 text-xs text-red-500">
                  {addForm.formState.errors.deptName.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                排序编号
              </label>
              <NumberInput
                value={addForm.watch('sortOrder')}
                onChange={(v) => addForm.setValue('sortOrder', v, { shouldValidate: true })}
                min={1}
                max={999}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                数字越小越靠前
              </p>
              {addForm.formState.errors.sortOrder && (
                <p className="mt-1 text-xs text-red-500">
                  {addForm.formState.errors.sortOrder.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              取消
            </Button>
            <Button
              loading={saveMutation.isPending}
              onClick={addForm.handleSubmit(onAddSubmit)}
            >
              创建部门
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 编辑弹窗 ─────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑部门 · {editNode?.deptName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                部门名称
              </label>
              <Input
                {...editForm.register('deptName')}
                placeholder="请输入部门名称"
                autoFocus
              />
              {editForm.formState.errors.deptName && (
                <p className="mt-1 text-xs text-red-500">
                  {editForm.formState.errors.deptName.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                排序编号
              </label>
              <NumberInput
                value={editForm.watch('sortOrder')}
                onChange={(v) => editForm.setValue('sortOrder', v, { shouldValidate: true })}
                min={1}
                max={999}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                数字越小越靠前
              </p>
              {editForm.formState.errors.sortOrder && (
                <p className="mt-1 text-xs text-red-500">
                  {editForm.formState.errors.sortOrder.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button
              loading={updateMutation.isPending}
              onClick={editForm.handleSubmit(onEditSubmit)}
            >
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
