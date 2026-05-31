import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import TopHeader from './TopHeader'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import BottomNav from './BottomNav'

export default function AppLayout() {
  const { theme } = useThemeStore()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  // Apply theme class to html element on mount and theme change
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark', 'ocean')
    root.classList.add(theme)
  }, [theme])

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev)

  return (
    <div className={cn('min-h-screen flex flex-col overflow-hidden')}>
      {/* Top Header - always visible */}
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onOpenMobileMenu={() => setMobileDrawerOpen(true)}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Body area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only (lg+) */}
        <Sidebar collapsed={sidebarCollapsed} />

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-bg-page)] transition-all duration-300',
            'lg:ml-[220px]',
            sidebarCollapsed && 'lg:ml-[64px]'
          )}
        >
          <div className="p-4 md:p-6 pb-20 md:pb-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation - mobile only */}
      <BottomNav />
    </div>
  )
}
