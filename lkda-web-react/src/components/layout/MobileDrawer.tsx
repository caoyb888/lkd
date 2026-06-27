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
  X,
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

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
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

  const handleNavigate = (path: string) => {
    navigate(path)
    onClose()
  }

  const isActive = (path: string) => location.pathname === path
  const isChildActive = (children?: MenuItem[]) =>
    children?.some((c) => location.pathname === c.path)

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-[260px] bg-[var(--color-bg-aside)] z-[70] transform transition-transform duration-300 lg:hidden flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-[var(--color-border-light)]">
          <span className="font-bold text-[var(--color-slate-title)]">莱矿·灵动智档</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-lighter)] transition-colors"
          >
            <X size={20} className="text-[var(--color-slate-body)]" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
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
                        'w-full flex items-center gap-3 rounded-btn px-3 h-[44px] text-sm transition-colors',
                        (isOpen || isActive(item.path))
                          ? 'text-primary-light font-semibold'
                          : 'text-[var(--color-slate-title)]'
                      )}
                    >
                      {Icon && <Icon size={20} />}
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        size={16}
                        className={cn('transition-transform', isOpen ? 'rotate-180' : '')}
                      />
                    </button>
                    {isOpen && (
                      <div className="ml-2 mt-1 space-y-1">
                        {item.children!.map((child) => {
                          const ChildIcon = iconMap[child.icon]
                          return (
                            <button
                              key={child.path}
                              onClick={() => handleNavigate(child.path)}
                              className={cn(
                                'w-full flex items-center gap-3 rounded-btn pl-10 pr-3 h-[40px] text-sm transition-colors',
                                isActive(child.path)
                                  ? 'bg-[var(--c-teal-dim)] text-primary-light font-semibold'
                                  : 'text-[var(--color-slate-body)]'
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
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-btn px-3 h-[44px] text-sm transition-colors',
                      isActive(item.path)
                        ? 'bg-[var(--c-teal-dim)] text-primary-light font-semibold'
                        : 'text-[var(--color-slate-title)]'
                    )}
                  >
                    {Icon && <Icon size={20} />}
                    <span>{item.title}</span>
                  </button>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </>
  )
}
