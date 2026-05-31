import { cn } from '@/lib/utils'

export default function BottomNav() {
  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t flex items-center justify-around z-50'
      )}
    >
      <span className="text-xs text-slate-body">首页</span>
      <span className="text-xs text-slate-body">案卷</span>
      <span className="text-xs text-slate-body">借阅</span>
      <span className="text-xs text-slate-body">我的</span>
    </nav>
  )
}
