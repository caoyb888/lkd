import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect, Suspense } from 'react'
import { cn } from '@/lib/utils'
import TopHeader from './TopHeader'
import Sidebar from './Sidebar'
import MobileDrawer from './MobileDrawer'
import BottomNav from './BottomNav'
import ErrorBoundary from '@/components/ErrorBoundary'
import PageLoading from './PageLoading'

export default function AppLayout() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev)

  return (
    <div className={cn('h-screen h-dvh flex flex-col overflow-hidden')}
      style={{ maxHeight: '100dvh' }}
    >
      {/* Top Header - always visible */}
      <div className="no-print">
        <TopHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      <div className="no-print">
        <MobileDrawer
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>

      {/* Body area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only (lg+) */}
        <div className="no-print">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden bg-[var(--color-bg-page)] transition-all duration-300',
            'lg:ml-[220px]',
            sidebarCollapsed && 'lg:ml-[64px]',
            'print:!ml-0'
          )}
        >
          <div className="p-3 md:p-4 pb-20 md:pb-4 min-h-full print:p-0">
            <ErrorBoundary>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Bottom Navigation - mobile only */}
      <div className="no-print">
        <BottomNav />
      </div>
    </div>
  )
}
