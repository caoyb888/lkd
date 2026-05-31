import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotifyStore } from '@/stores/notifyStore'
import {
  PanelLeftOpen,
  PanelLeftClose,
  Sun,
  Moon,
  Bell,
  LogOut,
  Lock,
  User,
  ChevronDown,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface TopHeaderProps {
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onOpenMobileMenu?: () => void
}

export default function TopHeader({
  sidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileMenu,
}: TopHeaderProps) {
  const navigate = useNavigate()
  const { userInfo, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { todoCount } = useNotifyStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBellClick = () => {
    const role = userInfo?.role
    if (role === 'archive_admin') {
      navigate('/approve/review')
    } else if (role === 'company_leader') {
      navigate('/approve/history')
    } else {
      navigate('/borrow/my')
    }
  }

  return (
    <header
      className={cn(
        'h-[60px] flex-shrink-0 flex items-center justify-between px-4 sticky top-0 z-50 transition-colors duration-300'
      )}
      style={{
        background: 'var(--color-header-bg)',
        color: 'var(--color-header-text)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-[34px] h-[34px] bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-sm">矿</span>
        </div>

        {/* Toggle Sidebar (desktop) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/15 transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={20} className="opacity-90" />
          ) : (
            <PanelLeftClose size={20} className="opacity-90" />
          )}
        </button>

        {/* Hamburger (mobile) */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/15 transition-colors"
        >
          <PanelLeftOpen size={20} className="opacity-90" />
        </button>

        {/* Title */}
        <span className="hidden sm:block text-[17px] font-semibold tracking-wide">
          莱矿-档案管理系统
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/15 transition-colors"
          title="切换主题"
        >
          {theme === 'ocean' ? (
            <Sun size={20} className="opacity-90" />
          ) : (
            <Moon size={20} className="opacity-90" />
          )}
        </button>

        {/* Notification bell */}
        <button
          onClick={handleBellClick}
          className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/15 transition-colors"
        >
          <Bell size={20} className="opacity-90" />
          {todoCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {todoCount > 99 ? '99+' : todoCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded-full hover:bg-white/15 transition-colors"
          >
            <div className="w-[30px] h-[30px] rounded-full bg-white/25 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {userInfo?.nickname?.[0] ?? 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium max-w-[90px] truncate">
              {userInfo?.nickname}
            </span>
            <ChevronDown size={12} className="opacity-70" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-card shadow-lg border border-[var(--color-border-light)] py-1 z-50 overflow-hidden">
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/profile')
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-title hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                <User size={16} />
                个人中心
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/profile/password')
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-title hover:bg-[var(--color-bg-soft)] transition-colors"
              >
                <Lock size={16} />
                修改密码
              </button>
              <div className="my-1 border-t border-[var(--color-border-light)]" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
