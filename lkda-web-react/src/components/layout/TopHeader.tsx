import { cn } from '@/lib/utils'

export default function TopHeader() {
  return (
    <header
      className={cn(
        'h-14 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-40'
      )}
    >
      <div className="font-bold text-slate-title">莱矿-档案管理系统</div>
    </header>
  )
}
