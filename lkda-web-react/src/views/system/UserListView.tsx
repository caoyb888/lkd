import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  RefreshCw,
  Edit3,
  KeyRound,
  Power,
  PowerOff,
  Users,
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
import { Badge } from '@/components/ui/badge'
import Pagination from '@/components/ui/pagination'
import EmptyState from '@/components/EmptyState'
import { UserApi, type UserListVO } from '@/api/system/user'
import { DeptApi } from '@/api/system/dept'
import type { DeptVO } from '@/types/vo'
import { desensitizePhone } from '@/lib/desensitize'
import { cn } from '@/lib/utils'

/* ── 常量 ───────────────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'ROLE_ADMIN', label: '管理员' },
  { value: 'ROLE_USER', label: '普通用户' },
  { value: 'ROLE_LEADER', label: '公司领导' },
] as const

const ROLE_LABEL: Record<string, string> = {
  ROLE_ADMIN: '管理员',
  ROLE_USER: '普通用户',
  ROLE_LEADER: '公司领导',
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  ROLE_ADMIN: 'bg-[var(--color-bg-soft)] text-emerald-300',
  ROLE_USER: 'bg-blue-500/15 text-blue-300',
  ROLE_LEADER: 'bg-violet-500/15 text-violet-300',
}

const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

/* ── 辅助函数 ───────────────────────────────────────────────── */
function flattenDepts(depts: DeptVO[]): { deptId: number; deptName: string }[] {
  const result: { deptId: number; deptName: string }[] = []
  function walk(items: DeptVO[], level: number) {
    for (const item of items) {
      result.push({
        deptId: item.deptId,
        deptName: '　'.repeat(level) + item.deptName,
      })
      if (item.children?.length) walk(item.children, level + 1)
    }
  }
  walk(depts, 0)
  return result
}

/* ── 表单校验 ───────────────────────────────────────────────── */
const baseSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  nickname: z.string().min(1, '请输入昵称'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  deptId: z.number({ message: '请选择所属部门' }).optional(),
  roles: z.array(z.string()).min(1, '请至少选择一个角色'),
  password: z.string().optional(),
}).refine((data) => data.deptId !== undefined && data.deptId > 0, {
  message: '请选择所属部门',
  path: ['deptId'],
})

const createSchema = baseSchema.refine((data) => {
  return !!data.password && data.password.length > 0 && PASSWORD_REGEX.test(data.password)
}, {
  message: '须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位',
  path: ['password'],
})

const updateSchema = baseSchema

type DrawerFormData = z.infer<typeof baseSchema>

const resetPwdSchema = z
  .object({
    password: z
      .string()
      .min(1, '请输入新密码')
      .regex(
        PASSWORD_REGEX,
        '须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位'
      ),
    confirm: z.string().min(1, '请再次输入新密码'),
  })
  .refine((data) => data.password === data.confirm, {
    message: '两次密码不一致',
    path: ['confirm'],
  })

type ResetPwdFormData = z.infer<typeof resetPwdSchema>

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function UserListView() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState<{
    username: string
    deptId: number | undefined
  }>({ username: '', deptId: undefined })
  const [pagination, setPagination] = useState({
    current: 1,
    size: 20,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserListVO | null>(null)
  const [resetPwdOpen, setResetPwdOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserListVO | null>(null)

  const isEdit = !!editingUser

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['user', 'page', pagination.current, pagination.size, search],
    queryFn: () =>
      UserApi.page({
        current: pagination.current,
        size: pagination.size,
        username: search.username || undefined,
        deptId: search.deptId,
      }),
  })

  const { data: deptTree } = useQuery({
    queryKey: ['dept', 'tree'],
    queryFn: () => DeptApi.tree(),
  })

  const flatDepts = useMemo(
    () => flattenDepts(deptTree ?? []),
    [deptTree]
  )

  /* ── 变更操作 ─────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId?: number
      payload: unknown
    }) => {
      if (userId) {
        return UserApi.update(
          userId,
          payload as Parameters<typeof UserApi.update>[1]
        )
      }
      return UserApi.save(payload as Parameters<typeof UserApi.save>[0])
    },
    onSuccess: () => {
      toast.success(isEdit ? '用户信息已更新' : '用户创建成功')
      setDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['user', 'page'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
    }: {
      userId: number
      status: number
    }) => UserApi.changeStatus(userId, status),
    onSuccess: () => {
      toast.success('状态已更新')
      queryClient.invalidateQueries({ queryKey: ['user', 'page'] })
    },
  })

  const resetPwdMutation = useMutation({
    mutationFn: ({
      userId,
      password,
    }: {
      userId: number
      password: string
    }) => UserApi.resetPassword(userId, password),
    onSuccess: () => {
      toast.success('密码已重置')
      setResetPwdOpen(false)
    },
  })

  /* ── 表格 ─────────────────────────────────────────────────── */
  const columnHelper = createColumnHelper<UserListVO>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', { header: '用户名' }),
      columnHelper.accessor('nickname', { header: '昵称' }),
      columnHelper.accessor('phone', {
        header: '手机号',
        cell: (info) => <span className="whitespace-nowrap">{desensitizePhone(info.getValue())}</span>,
      }),
      columnHelper.accessor('deptName', { header: '所属部门' }),
      columnHelper.accessor('roles', {
        header: '角色',
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((r) => (
              <span
                key={r}
                className={cn(
                  'inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-medium',
                  ROLE_BADGE_CLASS[r] ?? 'bg-[var(--color-bg-soft)] text-slate-body'
                )}
              >
                {ROLE_LABEL[r] ?? r}
              </span>
            ))}
          </div>
        ),
      }),
      columnHelper.accessor('status', {
        header: '账号状态',
        cell: (info) => (
          <span className="whitespace-nowrap">
            <Badge variant={info.getValue() === 1 ? 'success' : 'danger'}>
              {info.getValue() === 1 ? '启用' : '禁用'}
            </Badge>
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: '创建时间',
        cell: (info) => (
          <span className="whitespace-nowrap">
            {info.getValue()?.slice(0, 16).replace('T', ' ') ?? '-'}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const user = row.original
          return (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => openEdit(user)}
                    >
                      <Edit3 size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7',
                        user.status === 1
                          ? 'text-red-400 hover:bg-red-500/15'
                          : 'text-green-300 hover:bg-green-500/15'
                      )}
                      onClick={() => handleToggleStatus(user)}
                    >
                      {user.status === 1 ? <PowerOff size={14} /> : <Power size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{user.status === 1 ? '禁用' : '启用'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-accent hover:bg-accent/10"
                      onClick={() => openResetPwd(user)}
                    >
                      <KeyRound size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重置密码</TooltipContent>
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
    data: pageData?.records ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  /* ── 表单 ─────────────────────────────────────────────────── */
  const drawerForm = useForm<DrawerFormData>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema),
    defaultValues: {
      username: '',
      nickname: '',
      phone: '',
      deptId: undefined,
      roles: [],
      password: '',
    },
  })

  // 当 isEdit 变化时，清除错误
  useEffect(() => {
    drawerForm.clearErrors()
  }, [isEdit, drawerForm])

  const resetPwdForm = useForm<ResetPwdFormData>({
    resolver: zodResolver(resetPwdSchema),
    defaultValues: { password: '', confirm: '' },
  })

  /* ── 事件处理 ─────────────────────────────────────────────── */
  function handleSearch() {
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  function handleReset() {
    setSearch({ username: '', deptId: undefined })
    setPagination((prev) => ({ ...prev, current: 1 }))
  }

  function openAdd() {
    setEditingUser(null)
    drawerForm.reset({
      username: '',
      nickname: '',
      phone: '',
      deptId: undefined,
      roles: [],
      password: '',
    })
    setDrawerOpen(true)
  }

  function openEdit(user: UserListVO) {
    setEditingUser(user)
    drawerForm.reset({
      username: user.username,
      nickname: user.nickname,
      phone: user.phoneRaw || user.phone,
      deptId: user.deptId,
      roles: [...user.roles],
      password: '',
    })
    setDrawerOpen(true)
  }

  function openResetPwd(user: UserListVO) {
    setResetTarget(user)
    resetPwdForm.reset({ password: '', confirm: '' })
    setResetPwdOpen(true)
  }

  function handleToggleStatus(user: UserListVO) {
    const toEnable = user.status === 0
    const label = toEnable ? '启用' : '禁用'
    if (!window.confirm(`确定要${label}用户「${user.nickname}」的账号吗？`))
      return
    statusMutation.mutate({ userId: user.userId, status: toEnable ? 1 : 0 })
  }

  function onDrawerSubmit(data: DrawerFormData) {
    if (!data.deptId) return
    if (isEdit && editingUser) {
      const { password: _, ...rest } = data
      saveMutation.mutate({
        userId: editingUser.userId,
        payload: { ...rest, deptId: data.deptId },
      })
    } else {
      saveMutation.mutate({
        payload: { ...data, deptId: data.deptId } as {
          username: string
          nickname: string
          phone: string
          deptId: number
          roles: string[]
          password: string
        },
      })
    }
  }

  function onResetPwdSubmit(data: ResetPwdFormData) {
    if (!resetTarget) return
    resetPwdMutation.mutate({
      userId: resetTarget.userId,
      password: data.password,
    })
  }

  const records = pageData?.records ?? []
  const totalPages = Math.ceil((pageData?.total ?? 0) / pagination.size)

  return (
    <div>
      {/* Desktop: title + filter merged */}
      <div className="mb-3 hidden md:block">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary-dark" />
            <h2 className="text-xl font-bold text-slate-title">用户管理</h2>
          </div>
          <Button onClick={openAdd}>
            <Plus size={16} />
            新建用户
          </Button>
        </div>
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="按用户名搜索"
            className="md:w-56"
            value={search.username}
            onChange={(e) =>
              setSearch((prev) => ({ ...prev, username: e.target.value }))
            }
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Select
            value={search.deptId?.toString() ?? '_all'}
            onValueChange={(v) =>
              setSearch((prev) => ({
                ...prev,
                deptId: v === '_all' ? undefined : Number(v),
              }))
            }
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="按部门筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部部门</SelectItem>
              {flatDepts.map((d) => (
                <SelectItem key={d.deptId} value={d.deptId.toString()}>
                  {d.deptName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Search size={16} />
              查询
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw size={16} />
              重置
            </Button>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile: standalone header */}
      <PageHeader title={<span className="inline-flex items-center gap-2"><Users size={20} className="text-primary-dark" />用户管理</span>} className="md:hidden" />

      {/* Mobile: filter card */}
      <div className="mb-3 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5 md:hidden">
        <div className="flex flex-col gap-3">
          <Input
            placeholder="按用户名搜索"
            value={search.username}
            onChange={(e) =>
              setSearch((prev) => ({ ...prev, username: e.target.value }))
            }
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Select
            value={search.deptId?.toString() ?? '_all'}
            onValueChange={(v) =>
              setSearch((prev) => ({
                ...prev,
                deptId: v === '_all' ? undefined : Number(v),
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="按部门筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部部门</SelectItem>
              {flatDepts.map((d) => (
                <SelectItem key={d.deptId} value={d.deptId.toString()}>
                  {d.deptName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Search size={16} />
              查询
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw size={16} />
              重置
            </Button>
          </div>
        </div>
      </div>

      {/* ── 工具栏 + 内容 ────────────────────────────────────── */}
      <div className="overflow-hidden rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)]">
        <div className="border-b border-[var(--color-border-light)] px-5 py-3">
          <span className="text-sm text-slate-body">
            共{' '}
            <strong className="text-primary-dark">
              {pageData?.total ?? 0}
            </strong>{' '}
            条记录
          </span>
        </div>

        {/* 电脑端表格 */}
        <div className="hidden md:block overflow-auto">
          {isLoading ? (
            <div className="space-y-3 p-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-[var(--color-bg-soft)]"
                />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-12">
              <EmptyState description="暂无用户数据" />
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
                          : flexRender(
                              h.column.columnDef.header,
                              h.getContext()
                            )}
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* 手机端卡片列表 */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-card bg-[var(--color-bg-soft)]"
              />
            ))
          ) : records.length === 0 ? (
            <EmptyState description="暂无用户数据" />
          ) : (
            records.map((user) => (
              <div
                key={user.userId}
                className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-slate-title">
                      {user.nickname}
                    </div>
                    <div className="text-sm text-slate-body">
                      {user.username}
                    </div>
                  </div>
                  <Badge
                    variant={user.status === 1 ? 'success' : 'danger'}
                  >
                    {user.status === 1 ? '启用' : '禁用'}
                  </Badge>
                </div>
                <div className="mb-3 space-y-2 text-sm text-slate-body">
                  <div className="flex justify-between">
                    <span>手机号</span>
                    <span>{desensitizePhone(user.phone)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>所属部门</span>
                    <span>{user.deptName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>角色</span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {user.roles.map((r) => (
                        <span
                          key={r}
                          className={cn(
                            'inline-flex items-center rounded-tag px-2 py-0.5 text-xs font-medium',
                            ROLE_BADGE_CLASS[r] ??
                              'bg-[var(--color-bg-soft)] text-slate-body'
                          )}
                        >
                          {ROLE_LABEL[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>创建时间</span>
                    <span className="text-xs">
                      {user.createdAt?.slice(0, 16).replace('T', ' ') ??
                        '-'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-[var(--color-border-light)] pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(user)}
                  >
                    <Edit3 size={14} className="mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant={user.status === 1 ? 'danger' : 'primary'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleStatus(user)}
                  >
                    {user.status === 1 ? (
                      <>
                        <PowerOff size={14} className="mr-1" />
                        禁用
                      </>
                    ) : (
                      <>
                        <Power size={14} className="mr-1" />
                        启用
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-accent/30 text-accent"
                    onClick={() => openResetPwd(user)}
                  >
                    <KeyRound size={14} className="mr-1" />
                    重置密码
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="border-t border-[var(--color-border-light)] px-5 py-4">
            <Pagination
              current={pagination.current}
              total={totalPages}
              onChange={(p) =>
                setPagination((prev) => ({ ...prev, current: p }))
              }
            />
          </div>
        )}
      </div>

      {/* ── 新建/编辑 Drawer ─────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEdit ? '编辑用户' : '新建用户'}</DrawerTitle>
            <DrawerCloseButton />
          </DrawerHeader>
          <DrawerBody>
            <form
              id="user-form"
              onSubmit={drawerForm.handleSubmit(onDrawerSubmit)}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  用户名{' '}
                  {isEdit && (
                    <span className="text-xs font-normal text-[var(--text-faint)]">
                      （不可修改）
                    </span>
                  )}
                </label>
                <Input
                  {...drawerForm.register('username')}
                  placeholder="请输入用户名（用于登录）"
                  disabled={isEdit}
                />
                {drawerForm.formState.errors.username && (
                  <p className="mt-1 text-xs text-red-400">
                    {drawerForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  昵称
                </label>
                <Input
                  {...drawerForm.register('nickname')}
                  placeholder="请输入显示昵称"
                />
                {drawerForm.formState.errors.nickname && (
                  <p className="mt-1 text-xs text-red-400">
                    {drawerForm.formState.errors.nickname.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  手机号
                </label>
                <Input
                  {...drawerForm.register('phone')}
                  placeholder="请输入手机号"
                  maxLength={11}
                />
                {drawerForm.formState.errors.phone && (
                  <p className="mt-1 text-xs text-red-400">
                    {drawerForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  所属部门
                </label>
                <Select
                  value={drawerForm.watch('deptId')?.toString() ?? '_all'}
                  onValueChange={(v) =>
                    drawerForm.setValue(
                      'deptId',
                      v === '_all' ? undefined : Number(v),
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择所属部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {flatDepts.map((d) => (
                      <SelectItem
                        key={d.deptId}
                        value={d.deptId.toString()}
                      >
                        {d.deptName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {drawerForm.formState.errors.deptId && (
                  <p className="mt-1 text-xs text-red-400">
                    {drawerForm.formState.errors.deptId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                  角色
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const checked = drawerForm
                      .watch('roles')
                      ?.includes(opt.value)
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-btn border px-3 py-2 text-sm transition-colors',
                          checked
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-[var(--color-border-light)] text-slate-body hover:bg-[var(--color-bg-soft)]'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          value={opt.value}
                          checked={checked}
                          onChange={(e) => {
                            const current =
                              drawerForm.getValues('roles') ?? []
                            const next = e.target.checked
                              ? [...current, opt.value]
                              : current.filter((v) => v !== opt.value)
                            drawerForm.setValue('roles', next, {
                              shouldValidate: true,
                            })
                          }}
                        />
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            checked
                              ? 'border-primary bg-primary'
                              : 'border-[var(--color-border-medium)]'
                          )}
                        >
                          {checked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
                {drawerForm.formState.errors.roles && (
                  <p className="mt-1 text-xs text-red-400">
                    {drawerForm.formState.errors.roles.message}
                  </p>
                )}
              </div>

              {!isEdit && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                    初始密码
                  </label>
                  <Input
                    {...drawerForm.register('password')}
                    type="password"
                    placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
                  />
                  <div className="mt-2 flex items-start gap-2 rounded-btn border border-amber-500/30 bg-amber-500/15 p-3 text-xs text-amber-300">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-0.5 shrink-0 text-amber-400"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    密码须同时包含字母、数字、特殊字符（$ @ ! % * # ?
                    &），且长度 ≥ 6 位
                  </div>
                  {drawerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-400">
                      {drawerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              )}
            </form>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              取消
            </Button>
            <Button
              loading={saveMutation.isPending}
              onClick={drawerForm.handleSubmit(onDrawerSubmit)}
            >
              {isEdit ? '保存修改' : '创建用户'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── 重置密码 Dialog ──────────────────────────────────── */}
      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="mb-4 flex items-center gap-2 rounded-btn border border-orange-500/30 bg-orange-500/15 p-3 text-sm text-orange-300">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-accent"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            正在为用户「
            <strong>{resetTarget?.nickname}</strong>
            」重置密码，请谨慎操作。
          </div>
          <form
            id="reset-pwd-form"
            onSubmit={resetPwdForm.handleSubmit(onResetPwdSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                新密码
              </label>
              <Input
                {...resetPwdForm.register('password')}
                type="password"
                placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
              />
              {resetPwdForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {resetPwdForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-body">
                确认新密码
              </label>
              <Input
                {...resetPwdForm.register('confirm')}
                type="password"
                placeholder="请再次输入新密码"
              />
              {resetPwdForm.formState.errors.confirm && (
                <p className="mt-1 text-xs text-red-400">
                  {resetPwdForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPwdOpen(false)}
            >
              取消
            </Button>
            <Button
              loading={resetPwdMutation.isPending}
              onClick={resetPwdForm.handleSubmit(onResetPwdSubmit)}
            >
              确认重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
