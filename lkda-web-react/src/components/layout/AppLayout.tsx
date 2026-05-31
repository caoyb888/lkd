import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function AppLayout() {
  return (
    <div className={cn('min-h-screen bg-background-soft')}>
      <header className="h-14 bg-white border-b flex items-center px-4">
        <h1 className="text-lg font-bold text-slate-title">
          莱矿-档案管理系统
        </h1>
      </header>
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
