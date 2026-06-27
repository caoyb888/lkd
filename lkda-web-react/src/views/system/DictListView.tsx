import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Library,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Power,
  PowerOff,
  ChevronLeft,
  Trash2,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NumberInput } from '@/components/ui/number-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DictApi, type DictVO } from '@/api/system/dict'
import type { DictItemVO } from '@/types/vo'
import { useDictStore } from '@/stores/dictStore'
import { cn } from '@/lib/utils'

/* ── 表单校验 ───────────────────────────────────────────────── */
const dictSchema = z.object({
  dictCode: z
    .string()
    .min(1, '请输入字典编码')
    .regex(/^[a-z_][a-z0-9_]*$/, '编码只能包含小写字母、数字和下划线'),
  dictName: z.string().min(1, '请输入字典名称'),
  remark: z.string().optional(),
  status: z.number().min(0).max(1),
})

const dictItemSchema = z.object({
  itemValue: z.string().min(1, '请输入字典值'),
  itemLabel: z.string().min(1, '请输入显示名称'),
  sortOrder: z.number().min(1).max(999),
  status: z.number().min(0).max(1),
})

type DictFormData = z.infer<typeof dictSchema>
type DictItemFormData = z.infer<typeof dictItemSchema>

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function DictListView() {
  const queryClient = useQueryClient()
  const dictStore = useDictStore()

  const [selectedDict, setSelectedDict] = useState<DictVO | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')

  const [dictSearch, setDictSearch] = useState({
    dictCode: '',
    dictName: '',
  })
  const [dictPagination, setDictPagination] = useState({
    current: 1,
    size: 20,
  })

  // 弹窗状态
  const [dictDlgOpen, setDictDlgOpen] = useState(false)
  const [editDictRow, setEditDictRow] = useState<DictVO | null>(null)
  const [itemDlgOpen, setItemDlgOpen] = useState(false)
  const [editItemRow, setEditItemRow] = useState<DictItemVO | null>(null)

  const isDictEdit = !!editDictRow
  const isItemEdit = !!editItemRow

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: dictPageData, isLoading: dictLoading } = useQuery({
    queryKey: [
      'dict',
      'page',
      dictPagination.current,
      dictPagination.size,
      dictSearch,
    ],
    queryFn: () =>
      DictApi.page({
        current: dictPagination.current,
        size: dictPagination.size,
        dictCode: dictSearch.dictCode || undefined,
        dictName: dictSearch.dictName || undefined,
      }),
  })

  const { data: itemsList, isLoading: itemsLoading } = useQuery({
    queryKey: ['dict', 'items', selectedDict?.dictCode],
    queryFn: () => {
      if (!selectedDict) return Promise.resolve([] as DictItemVO[])
      return DictApi.listItems(selectedDict.dictCode)
    },
    enabled: !!selectedDict,
  })

  /* ── 变更操作 ─────────────────────────────────────────────── */
  const saveDictMutation = useMutation({
    mutationFn: (data: Parameters<typeof DictApi.save>[0]) =>
      DictApi.save(data),
    onSuccess: () => {
      toast.success(isDictEdit ? '字典已更新' : '字典创建成功')
      setDictDlgOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dict', 'page'] })
      dictStore.loadAll()
    },
  })

  const updateDictMutation = useMutation({
    mutationFn: ({
      dictId,
      data,
    }: {
      dictId: number
      data: Parameters<typeof DictApi.update>[1]
    }) => DictApi.update(dictId, data),
    onSuccess: () => {
      toast.success('字典已更新')
      setDictDlgOpen(false)
      queryClient.invalidateQueries({ queryKey: ['dict', 'page'] })
      dictStore.loadAll()
    },
  })

  const changeDictStatusMutation = useMutation({
    mutationFn: ({
      dictId,
      status,
      dictName,
    }: {
      dictId: number
      status: number
      dictName: string
    }) => DictApi.changeStatus(dictId, status, dictName),
    onSuccess: () => {
      toast.success('状态已更新')
      queryClient.invalidateQueries({ queryKey: ['dict', 'page'] })
      dictStore.loadAll()
    },
  })

  const saveItemMutation = useMutation({
    mutationFn: (data: Parameters<typeof DictApi.saveItem>[0]) =>
      DictApi.saveItem(data),
    onSuccess: () => {
      toast.success(isItemEdit ? '字典项已更新' : '字典项已添加')
      setItemDlgOpen(false)
      afterItemChange()
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: number
      data: Parameters<typeof DictApi.updateItem>[1]
    }) => DictApi.updateItem(itemId, data),
    onSuccess: () => {
      toast.success('字典项已更新')
      setItemDlgOpen(false)
      afterItemChange()
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: DictApi.deleteItem,
    onSuccess: () => {
      toast.success('字典项已删除')
      afterItemChange()
    },
  })

  async function afterItemChange() {
    if (selectedDict) {
      queryClient.invalidateQueries({
        queryKey: ['dict', 'items', selectedDict.dictCode],
      })
    }
    dictStore.loadAll()
  }

  /* ── 表单 ─────────────────────────────────────────────────── */
  const dictForm = useForm<DictFormData>({
    resolver: zodResolver(dictSchema),
    defaultValues: { dictCode: '', dictName: '', remark: '', status: 1 },
  })

  const itemForm = useForm<DictItemFormData>({
    resolver: zodResolver(dictItemSchema),
    defaultValues: {
      itemValue: '',
      itemLabel: '',
      sortOrder: 1,
      status: 1,
    },
  })

  /* ── 事件处理 ─────────────────────────────────────────────── */
  function handleDictSearch() {
    setDictPagination((prev) => ({ ...prev, current: 1 }))
  }

  function handleDictReset() {
    setDictSearch({ dictCode: '', dictName: '' })
    setDictPagination((prev) => ({ ...prev, current: 1 }))
  }

  function handleSelectDict(dict: DictVO) {
    setSelectedDict(dict)
    setMobileView('detail')
  }

  function handleBackToList() {
    setMobileView('list')
    setSelectedDict(null)
  }

  function openAddDict() {
    setEditDictRow(null)
    dictForm.reset({ dictCode: '', dictName: '', remark: '', status: 1 })
    setDictDlgOpen(true)
  }

  function openEditDict(row: DictVO, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditDictRow(row)
    dictForm.reset({
      dictCode: row.dictCode,
      dictName: row.dictName,
      remark: row.remark ?? '',
      status: row.status,
    })
    setDictDlgOpen(true)
  }

  function handleDictStatus(row: DictVO, e: React.MouseEvent) {
    e.stopPropagation()
    const toEnable = row.status === 0
    const msg = toEnable
      ? `确定要启用字典「${row.dictName}」吗？`
      : `停用字典「${row.dictName}」后，业务下拉框中该字典下仍启用的选项不受影响，但该字典将无法继续维护。确定停用？`
    if (!window.confirm(msg)) return
    changeDictStatusMutation.mutate({
      dictId: row.dictId,
      status: toEnable ? 1 : 0,
      dictName: row.dictName,
    })
  }

  function openAddItem() {
    if (!selectedDict) return
    setEditItemRow(null)
    const nextSort = (itemsList?.length ?? 0) + 1
    itemForm.reset({
      itemValue: '',
      itemLabel: '',
      sortOrder: nextSort,
      status: 1,
    })
    setItemDlgOpen(true)
  }

  function openEditItem(row: DictItemVO) {
    setEditItemRow(row)
    itemForm.reset({
      itemValue: row.itemValue,
      itemLabel: row.itemLabel,
      sortOrder: row.sortOrder,
      status: row.status,
    })
    setItemDlgOpen(true)
  }

  function handleDeleteItem(row: DictItemVO) {
    if (
      !window.confirm(
        `确定删除字典项「${row.itemLabel}（${row.itemValue}）」吗？`
      )
    )
      return
    deleteItemMutation.mutate(row.itemId)
  }

  function handleItemStatus(row: DictItemVO) {
    const toEnable = row.status === 0
    updateItemMutation.mutate({
      itemId: row.itemId,
      data: {
        dictCode: row.dictCode,
        itemValue: row.itemValue,
        itemLabel: row.itemLabel,
        sortOrder: row.sortOrder,
        status: toEnable ? 1 : 0,
      },
    })
  }

  function onDictSubmit(data: DictFormData) {
    if (isDictEdit && editDictRow) {
      updateDictMutation.mutate({
        dictId: editDictRow.dictId,
        data: {
          dictCode: data.dictCode,
          dictName: data.dictName,
          remark: data.remark,
          status: data.status,
        },
      })
    } else {
      saveDictMutation.mutate({
        dictCode: data.dictCode,
        dictName: data.dictName,
        remark: data.remark,
        status: data.status,
      })
    }
  }

  function onItemSubmit(data: DictItemFormData) {
    if (!selectedDict) return
    if (isItemEdit && editItemRow) {
      updateItemMutation.mutate({
        itemId: editItemRow.itemId,
        data: {
          dictCode: selectedDict.dictCode,
          itemValue: data.itemValue,
          itemLabel: data.itemLabel,
          sortOrder: data.sortOrder,
          status: data.status,
        },
      })
    } else {
      saveItemMutation.mutate({
        dictCode: selectedDict.dictCode,
        itemValue: data.itemValue,
        itemLabel: data.itemLabel,
        sortOrder: data.sortOrder,
        status: data.status,
      })
    }
  }

  const dictRecords = dictPageData?.records ?? []
  const dictTotalPages = Math.ceil(
    (dictPageData?.total ?? 0) / dictPagination.size
  )

  /* ════════════════════════════════════════════════════════════ */
  /* 电脑端：左右分栏                                          */
  /* ════════════════════════════════════════════════════════════ */
  const DesktopLayout = () => (
    <div className="hidden lg:flex gap-3 items-start">
      {/* 左侧：字典列表 */}
      <div className="w-[320px] shrink-0 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-title">
            <Library size={16} className="text-primary" />
            字典列表
          </span>
          <Button size="sm" onClick={openAddDict}>
            <Plus size={14} /> 新增
          </Button>
        </div>
        <div className="p-3">
          {/* 搜索 */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <Input
              placeholder="编码"
              className="h-8 text-sm flex-[2]"
              value={dictSearch.dictCode}
              onChange={(e) =>
                setDictSearch((prev) => ({
                  ...prev,
                  dictCode: e.target.value,
                }))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleDictSearch()}
            />
            <Input
              placeholder="名称"
              className="h-8 text-sm flex-[3]"
              value={dictSearch.dictName}
              onChange={(e) =>
                setDictSearch((prev) => ({
                  ...prev,
                  dictName: e.target.value,
                }))
              }
              onKeyDown={(e) => e.key === 'Enter' && handleDictSearch()}
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleDictSearch}>
              <Search size={14} />
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleDictReset}>
              <RefreshCw size={13} />
            </Button>
          </div>

          {/* 字典列表 */}
          <div className="flex flex-col gap-1 max-h-[520px] overflow-y-auto">
            {dictLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
              ))
            ) : dictRecords.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[var(--text-faint)]">
                <Library size={28} className="mb-2 text-[var(--text-faint)]" />
                <span className="text-xs">暂无字典数据</span>
              </div>
            ) : (
              dictRecords.map((row) => {
                const isActive = selectedDict?.dictId === row.dictId
                return (
                  <div
                    key={row.dictId}
                    className={cn(
                      'group relative cursor-pointer rounded-lg border border-transparent p-3 transition-all',
                      isActive
                        ? 'bg-gradient-to-br from-[var(--color-bg-lighter)] to-[var(--color-bg-soft)] border-[var(--color-border-medium)]'
                        : 'hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-light)]'
                    )}
                    onClick={() => handleSelectDict(row)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code
                        className={cn(
                          'text-xs font-semibold',
                          isActive ? 'text-primary-dark' : 'text-primary-dark'
                        )}
                      >
                        {row.dictCode}
                      </code>
                      <span
                        className={cn(
                          'rounded-tag px-1.5 py-0.5 text-[10px] font-semibold',
                          row.status === 1
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-red-500/15 text-red-300'
                        )}
                      >
                        {row.status === 1 ? '启用' : '停用'}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'text-sm truncate',
                        isActive
                          ? 'font-semibold text-slate-title'
                          : 'text-slate-body'
                      )}
                    >
                      {row.dictName}
                    </div>

                    {/* hover 操作 */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit rounded">
                      <button
                        className="p-1 text-[var(--text-faint)] hover:text-primary transition-colors"
                        onClick={(e) => openEditDict(row, e)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        className={cn(
                          'p-1 transition-colors',
                          row.status === 1
                            ? 'text-[var(--text-faint)] hover:text-red-400'
                            : 'text-[var(--text-faint)] hover:text-green-300'
                        )}
                        onClick={(e) => handleDictStatus(row, e)}
                      >
                        {row.status === 1 ? (
                          <PowerOff size={13} />
                        ) : (
                          <Power size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 分页 */}
          {dictTotalPages > 1 && (
            <div className="mt-3 flex justify-center">
              <Pagination
                current={dictPagination.current}
                total={dictTotalPages}
                onChange={(p) =>
                  setDictPagination((prev) => ({ ...prev, current: p }))
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* 右侧：字典项 */}
      <div className="flex-1 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-5 py-3">
          {selectedDict ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-title">
                <BookOpen size={16} className="text-primary" />
                {selectedDict.dictName}
              </span>
              <Badge variant="outline" className="font-mono text-[11px]">
                {selectedDict.dictCode}
              </Badge>
            </div>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-faint)]">
              <BookOpen size={16} className="text-[var(--text-faint)]" />
              字典项
            </span>
          )}
          {selectedDict && (
            <Button size="sm" onClick={openAddItem}>
              <Plus size={14} /> 新增字典项
            </Button>
          )}
        </div>

        <div className="p-0">
          {!selectedDict ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-bg-soft)] to-[var(--color-bg-soft)]">
                <Library size={28} className="text-primary-dark" />
              </div>
              <p className="text-base font-semibold text-slate-title">
                请在左侧选择字典
              </p>
              <p className="mt-1 text-sm text-[var(--text-faint)]">
                选中字典后查看并维护其字典项
              </p>
            </div>
          ) : itemsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-[var(--color-bg-soft)]" />
              ))}
            </div>
          ) : !itemsList || itemsList.length === 0 ? (
            <div className="py-12">
              <EmptyState description="该字典暂无字典项，点击右上角新增" />
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>字典值</TableHead>
                    <TableHead>显示名称</TableHead>
                    <TableHead className="text-center">排序</TableHead>
                    <TableHead className="text-center">状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {itemsList.map((row) => (
                    <TableRow key={row.itemId}>
                      <TableCell>
                        <code className="rounded bg-[var(--color-bg-lighter)] px-1.5 py-0.5 text-xs font-semibold text-primary-dark">
                          {row.itemValue}
                        </code>
                      </TableCell>
                      <TableCell>{row.itemLabel}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-bg-lighter)] text-xs font-semibold text-slate-body">
                          {row.sortOrder}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'rounded-tag px-2 py-0.5 text-[11px] font-medium',
                            row.status === 1
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-[var(--color-bg-soft)] text-slate-body'
                          )}
                        >
                          {row.status === 1 ? '启用' : '停用'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="link"
                            size="sm"
                            className="h-7 px-1.5 text-primary"
                            onClick={() => openEditItem(row)}
                          >
                            <Edit3 size={13} className="mr-0.5" />
                            编辑
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className={cn(
                              'h-7 px-1.5',
                              row.status === 1
                                ? 'text-orange-400'
                                : 'text-green-300'
                            )}
                            onClick={() => handleItemStatus(row)}
                          >
                            {row.status === 1 ? '停用' : '启用'}
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-7 px-1.5 text-red-400"
                            onClick={() => handleDeleteItem(row)}
                          >
                            <Trash2 size={13} className="mr-0.5" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ════════════════════════════════════════════════════════════ */
  /* 手机端：列表 → 详情页面级切换                              */
  /* ════════════════════════════════════════════════════════════ */
  const MobileLayout = () => (
    <div className="lg:hidden">
      {/* 列表视图 */}
      {mobileView === 'list' && (
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-title">
              <Library size={16} className="text-primary" />
              字典列表
            </span>
            <Button size="sm" onClick={openAddDict}>
              <Plus size={14} /> 新增
            </Button>
          </div>
          <div className="p-3">
            {/* 搜索 */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="编码/名称"
                className="h-8 text-sm"
                value={dictSearch.dictCode}
                onChange={(e) =>
                  setDictSearch((prev) => ({
                    ...prev,
                    dictCode: e.target.value,
                  }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleDictSearch()}
              />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleDictSearch}>
                <Search size={14} />
              </Button>
            </div>

            {/* 字典列表 */}
            {dictLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--color-bg-soft)]" />
                ))}
              </div>
            ) : dictRecords.length === 0 ? (
              <EmptyState description="暂无字典数据" />
            ) : (
              <div className="flex flex-col gap-2">
                {dictRecords.map((row) => (
                  <div
                    key={row.dictId}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border-light)] p-3 active:scale-[0.99] transition-transform"
                    onClick={() => handleSelectDict(row)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-semibold text-primary-dark">
                          {row.dictCode}
                        </code>
                        <Badge
                          variant={row.status === 1 ? 'success' : 'danger'}
                          className="text-[10px]"
                        >
                          {row.status === 1 ? '启用' : '停用'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-title truncate">
                        {row.dictName}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-faint)] shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {dictTotalPages > 1 && (
              <div className="mt-3">
                <Pagination
                  current={dictPagination.current}
                  total={dictTotalPages}
                  onChange={(p) =>
                    setDictPagination((prev) => ({ ...prev, current: p }))
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 详情视图 */}
      {mobileView === 'detail' && selectedDict && (
        <div>
          {/* 顶部返回栏 */}
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={handleBackToList}
            >
              <ChevronLeft size={14} />
              返回
            </Button>
            <div>
              <div className="text-base font-bold text-slate-title">
                {selectedDict.dictName}
              </div>
              <code className="text-xs text-primary-dark">
                {selectedDict.dictCode}
              </code>
            </div>
          </div>

          {/* 新增按钮 */}
          <Button className="w-full mb-3" onClick={openAddItem}>
            <Plus size={16} /> 新增字典项
          </Button>

          {/* 字典项卡片列表 */}
          {itemsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-card bg-[var(--color-bg-soft)]" />
              ))}
            </div>
          ) : !itemsList || itemsList.length === 0 ? (
            <EmptyState description="该字典暂无字典项" />
          ) : (
            <div className="flex flex-col gap-3">
              {itemsList.map((row) => (
                <div
                  key={row.itemId}
                  className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="rounded bg-[var(--color-bg-lighter)] px-1.5 py-0.5 text-xs font-semibold text-primary-dark">
                      {row.itemValue}
                    </code>
                    <Badge
                      variant={row.status === 1 ? 'success' : 'outline'}
                      className="text-[10px]"
                    >
                      {row.status === 1 ? '启用' : '停用'}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-slate-title mb-3">
                    {row.itemLabel}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-light)]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditItem(row)}
                    >
                      <Edit3 size={14} className="mr-1" /> 编辑
                    </Button>
                    <Button
                      variant={row.status === 1 ? 'outline' : 'primary'}
                      size="sm"
                      className={cn(
                        'flex-1',
                        row.status === 1 && 'border-orange-500/40 text-orange-300'
                      )}
                      onClick={() => handleItemStatus(row)}
                    >
                      {row.status === 1 ? (
                        <>
                          <XCircle size={14} className="mr-1" /> 停用
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="mr-1" /> 启用
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-400 border-red-500/30"
                      onClick={() => handleDeleteItem(row)}
                    >
                      <Trash2 size={14} className="mr-1" /> 删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <PageHeader title={<span className="inline-flex items-center gap-2"><Library size={20} className="text-primary-dark" />数据字典</span>} />
      <DesktopLayout />
      <MobileLayout />

      {/* ══ 字典表单弹窗 ════════════════════════════════════════ */}
      <Dialog open={dictDlgOpen} onOpenChange={setDictDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDictEdit
                ? `编辑字典 · ${editDictRow?.dictName}`
                : '新增字典'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={dictForm.handleSubmit(onDictSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                字典编码{' '}
                {isDictEdit && (
                  <span className="text-xs font-normal text-[var(--text-faint)]">
                    （不可修改）
                  </span>
                )}
              </label>
              <Input
                {...dictForm.register('dictCode')}
                placeholder="如 security_level（小写字母+下划线）"
                disabled={isDictEdit}
              />
              {dictForm.formState.errors.dictCode && (
                <p className="mt-1 text-xs text-red-400">
                  {dictForm.formState.errors.dictCode.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                字典名称
              </label>
              <Input
                {...dictForm.register('dictName')}
                placeholder="如 密级"
              />
              {dictForm.formState.errors.dictName && (
                <p className="mt-1 text-xs text-red-400">
                  {dictForm.formState.errors.dictName.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                备注
              </label>
              <textarea
                {...dictForm.register('remark')}
                placeholder="选填，说明该字典的用途"
                rows={2}
                className="w-full rounded-btn border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-3 py-2 text-sm text-[var(--color-slate-title)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                状态
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-body cursor-pointer">
                  <input
                    type="radio"
                    value={1}
                    {...dictForm.register('status', { valueAsNumber: true })}
                    className="h-4 w-4 accent-primary"
                  />
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-body cursor-pointer">
                  <input
                    type="radio"
                    value={0}
                    {...dictForm.register('status', { valueAsNumber: true })}
                    className="h-4 w-4 accent-primary"
                  />
                  停用
                </label>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDictDlgOpen(false)}>
              取消
            </Button>
            <Button
              loading={saveDictMutation.isPending || updateDictMutation.isPending}
              onClick={dictForm.handleSubmit(onDictSubmit)}
            >
              {isDictEdit ? '保存修改' : '创建字典'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ 字典项表单弹窗 ══════════════════════════════════════ */}
      <Dialog open={itemDlgOpen} onOpenChange={setItemDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isItemEdit ? '编辑字典项' : '新增字典项'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={itemForm.handleSubmit(onItemSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                所属字典
              </label>
              <Input
                value={`${selectedDict?.dictName}（${selectedDict?.dictCode}）`}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  字典值{' '}
                  {isItemEdit && (
                    <span className="text-xs font-normal text-[var(--text-faint)]">
                      （不可修改）
                    </span>
                  )}
                </label>
                <Input
                  {...itemForm.register('itemValue')}
                  placeholder="如 secret"
                  disabled={isItemEdit}
                />
                {itemForm.formState.errors.itemValue && (
                  <p className="mt-1 text-xs text-red-400">
                    {itemForm.formState.errors.itemValue.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  显示名称
                </label>
                <Input
                  {...itemForm.register('itemLabel')}
                  placeholder="如 机密"
                />
                {itemForm.formState.errors.itemLabel && (
                  <p className="mt-1 text-xs text-red-400">
                    {itemForm.formState.errors.itemLabel.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  排序
                </label>
                <NumberInput
                  value={itemForm.watch('sortOrder')}
                  onChange={(v) =>
                    itemForm.setValue('sortOrder', v, {
                      shouldValidate: true,
                    })
                  }
                  min={1}
                  max={999}
                />
                {itemForm.formState.errors.sortOrder && (
                  <p className="mt-1 text-xs text-red-400">
                    {itemForm.formState.errors.sortOrder.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  状态
                </label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-body cursor-pointer">
                    <input
                      type="radio"
                      value={1}
                      {...itemForm.register('status', {
                        valueAsNumber: true,
                      })}
                      className="h-4 w-4 accent-primary"
                    />
                    启用
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-body cursor-pointer">
                    <input
                      type="radio"
                      value={0}
                      {...itemForm.register('status', {
                        valueAsNumber: true,
                      })}
                      className="h-4 w-4 accent-primary"
                    />
                    停用
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-btn bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-amber-300">
              <Info size={14} className="mt-0.5 shrink-0 text-amber-400" />
              停用的字典项不会出现在业务下拉框中（如密级、保管期限选项）
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDlgOpen(false)}>
              取消
            </Button>
            <Button
              loading={saveItemMutation.isPending || updateItemMutation.isPending}
              onClick={itemForm.handleSubmit(onItemSubmit)}
            >
              {isItemEdit ? '保存修改' : '添加字典项'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
