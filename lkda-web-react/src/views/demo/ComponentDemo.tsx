import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
} from '@/components/ui/drawer'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/skeleton'
import Pagination from '@/components/ui/pagination'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { toast } from '@/components/ui/toast'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DataTable } from '@/components/ui/data-table'
import { DatePicker } from '@/components/ui/date-picker'
import { type ColumnDef } from '@tanstack/react-table'

interface DemoUser {
  id: number
  name: string
  role: string
  status: string
}

const demoColumns: ColumnDef<DemoUser>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: '姓名' },
  { accessorKey: 'role', header: '角色' },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => (
      <Badge variant={row.original.status === '正常' ? 'success' : 'warning'}>
        {row.original.status}
      </Badge>
    ),
  },
]

const demoData: DemoUser[] = [
  { id: 1, name: '张三', role: '管理员', status: '正常' },
  { id: 2, name: '李四', role: '普通用户', status: '正常' },
  { id: 3, name: '王五', role: '公司领导', status: '禁用' },
]

export default function ComponentDemo() {
  const [numValue, setNumValue] = useState(1)
  const [dateValue, setDateValue] = useState<Date | undefined>(new Date())
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-slate-title)]">
        基础 UI 组件库 Demo
      </h1>

      {/* Button */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Button 按钮</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
          <Button loading>Loading</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* Input */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Input 输入框</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="请输入内容" />
          <Input placeholder="禁用状态" disabled />
        </div>
      </section>

      {/* NumberInput */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">NumberInput 数字输入</h2>
        <NumberInput value={numValue} min={0} max={10} onChange={setNumValue} />
      </section>

      {/* Select */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Select 选择器</h2>
        <Select>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">选项一</SelectItem>
            <SelectItem value="2">选项二</SelectItem>
            <SelectItem value="3">选项三</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* DatePicker */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">DatePicker 日期选择</h2>
        <DatePicker value={dateValue} onChange={setDateValue} />
      </section>

      {/* Dialog */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Dialog 对话框</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认操作</DialogTitle>
              <DialogDescription>这是一个对话框示例，手机端会从底部弹出。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setDialogOpen(false)}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Drawer */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Drawer 抽屉</h2>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline">打开抽屉</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>编辑信息</DrawerTitle>
              <DrawerCloseButton />
            </DrawerHeader>
            <DrawerBody>
              <p className="text-[var(--color-slate-body)]">
                抽屉内容区域。电脑端从右侧滑出，手机端从底部滑出。
              </p>
            </DrawerBody>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                取消
              </Button>
              <Button onClick={() => setDrawerOpen(false)}>保存</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </section>

      {/* Card */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Card 卡片</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>卡片标题</CardTitle>
              <CardDescription>卡片描述文字</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--color-slate-body)]">卡片内容区域</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">操作</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Badge */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Badge 徽标</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>默认</Badge>
          <Badge variant="success">成功</Badge>
          <Badge variant="warning">警告</Badge>
          <Badge variant="danger">危险</Badge>
          <Badge variant="outline">边框</Badge>
        </div>
      </section>

      {/* Alert */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Alert 提示</h2>
        <div className="space-y-3">
          <Alert>
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>这是一条普通提示信息。</AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>操作已成功完成。</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>请注意检查输入内容。</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>发生了一个错误，请重试。</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Skeleton */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Skeleton 骨架屏</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </section>

      {/* Pagination */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Pagination 分页</h2>
        <Pagination current={page} total={10} onChange={setPage} />
      </section>

      {/* Tabs */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Tabs 标签页</h2>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">标签一</TabsTrigger>
            <TabsTrigger value="tab2">标签二</TabsTrigger>
            <TabsTrigger value="tab3">标签三</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Card>
              <CardContent className="pt-4">
                标签一的内容区域
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab2">
            <Card>
              <CardContent className="pt-4">
                标签二的内容区域
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tab3">
            <Card>
              <CardContent className="pt-4">
                标签三的内容区域
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Tooltip */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Tooltip 文字提示</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">悬停查看提示</Button>
            </TooltipTrigger>
            <TooltipContent>这是一个 Tooltip 提示文字</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </section>

      {/* Toast */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Toast 轻提示</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success('操作成功')}>
            Success
          </Button>
          <Button variant="outline" onClick={() => toast.error('操作失败')}>
            Error
          </Button>
          <Button variant="outline" onClick={() => toast.info('提示信息')}>
            Info
          </Button>
          <Button variant="outline" onClick={() => toast.warning('警告信息')}>
            Warning
          </Button>
        </div>
      </section>

      {/* Table */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">Table 表格</h2>
        <div className="rounded-card border border-[var(--color-border-light)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>角色</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>1</TableCell>
                <TableCell>张三</TableCell>
                <TableCell>管理员</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2</TableCell>
                <TableCell>李四</TableCell>
                <TableCell>用户</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* DataTable (TanStack) */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-slate-title)] mb-3">
          DataTable (TanStack Table + 响应式)
        </h2>
        <p className="text-sm text-slate-body mb-3">
          电脑端显示标准表格，手机端自动切换为卡片列表
        </p>
        <DataTable columns={demoColumns} data={demoData} />
      </section>
    </div>
  )
}
