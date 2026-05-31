import { cn } from '@/lib/utils'

export default function Sidebar() {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-[220px] h-screen bg-background-aside border-r fixed left-0 top-0'
      )}
    >
      <div className="p-4 font-bold text-slate-title">莱矿-档案管理系统</div>
      <nav className="flex-1 px-3 space-y-1">菜单占位</nav>
    </aside>
  )
}
