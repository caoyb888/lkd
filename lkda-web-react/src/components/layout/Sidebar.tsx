import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { rawMenuTree, filterMenuTree, type MenuItem } from '@/lib/menu'
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  CircleCheck,
  ClipboardList,
  BookOpen,
  User,
  PenSquare,
  List,
  Trash2,
  Settings,
  UserCircle,
  Building,
  Library,
  ScrollText,
  Gavel,
  ChevronDown,
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  CircleCheck,
  ClipboardList,
  BookOpen,
  User,
  PenSquare,
  List,
  Trash2,
  Settings,
  UserCircle,
  Building,
  Library,
  ScrollText,
  Gavel,
}

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { userInfo } = useAuthStore()
  const menuTree = filterMenuTree(rawMenuTree, userInfo?.role)
  const [openedKeys, setOpenedKeys] = useState<string[]>([])

  const toggleSubMenu = (path: string) => {
    setOpenedKeys((prev) =>
      prev.includes(path) ? prev.filter((k) => k !== path) : [...prev, path]
    )
  }

  const isActive = (path: string) => location.pathname === path
  const isChildActive = (children?: MenuItem[]) =>
    children?.some((c) => location.pathname === c.path)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen bg-[var(--color-bg-aside)] border-r border-[var(--color-border-light)] fixed left-0 top-[60px] transition-all duration-300 z-30',
        collapsed ? 'w-[64px]' : 'w-[220px]'
      )}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 ">
        {menuTree.map((item) => {
          const Icon = iconMap[item.icon]
          const hasChildren = item.children && item.children.length > 0
          const isOpen = openedKeys.includes(item.path) || isChildActive(item.children)

          return (
            <div key={item.path} className="mb-1">
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.path)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-btn px-3 h-[42px] text-sm transition-colors',
                      (isOpen || isActive(item.path))
                        ? 'text-primary-light font-semibold'
                        : 'text-[var(--color-slate-title)] hover:bg-[var(--color-bg-soft)]'
                    )}
                  >
                    {Icon && <Icon size={18} />}
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            'transition-transform',
                            isOpen ? 'rotate-180' : ''
                          )}
                        />
                      </>
                    )}
                  </button>
                  {isOpen && !collapsed && (
                    <div className="ml-2 mt-1 space-y-1">
                      {item.children!.map((child) => {
                        const ChildIcon = iconMap[child.icon]
                        return (
                          <button
                            key={child.path}
                            onClick={() => navigate(child.path)}
                            className={cn(
                              'w-full flex items-center gap-2 rounded-btn pl-9 pr-3 h-[38px] text-[13px] transition-colors border-l-2',
                              isActive(child.path)
                                ? 'bg-[var(--c-teal-dim)] border-primary text-primary-light font-semibold'
                                : 'border-transparent text-[var(--color-slate-body)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-slate-title)]'
                            )}
                          >
                            {ChildIcon && <ChildIcon size={16} />}
                            <span>{child.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-btn px-3 h-[42px] text-sm transition-colors border-l-2',
                    isActive(item.path)
                      ? 'bg-[var(--c-teal-dim)] border-primary text-primary-light font-semibold'
                      : 'border-transparent text-[var(--color-slate-title)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-slate-title)]'
                  )}
                >
                  {Icon && <Icon size={18} />}
                  {!collapsed && <span>{item.title}</span>}
                </button>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
