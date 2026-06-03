import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  User,
} from 'lucide-react'

const navItems = [
  { path: '/', title: '首页', icon: LayoutDashboard },
  { path: '/volume/list', title: '案卷', icon: FolderOpen },
  { path: '/borrow/my', title: '借阅', icon: BookOpen },
  { path: '/profile', title: '我的', icon: User },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[var(--color-bg-main)] border-t border-[var(--color-border-light)] flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.path)
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
              active ? 'text-primary' : 'text-[var(--color-slate-body)]'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className={cn('text-[11px]', active && 'font-medium')}>
              {item.title}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
