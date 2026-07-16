import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileExploreSheet } from '@/components/layout/MobileExploreSheet'
import { Footer } from '@/components/layout/Footer'
import { useAuthStore } from '@/features/auth/authStore'
import { buildNavGroups } from '@/components/layout/navConfig'
import { useNotifications } from '@/features/notifications/useNotifications'

export function AppShell() {
  const [exploreOpen, setExploreOpen] = useState(false)
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const me = useAuthStore((s) => s.me)
  const { fetchNotifications } = useNotifications()

  // Derive showTasks from persona nav
  const visibleGroups = buildNavGroups(me)
  const allItems = visibleGroups.flatMap((g) => g.items)
  const showTasks = allItems.some((item) => item.path === '/my-tasks')

  useEffect(() => {
    if (!me) return
    void fetchNotifications()
  }, [fetchNotifications, me])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen flex-col bg-app-bg">
      {/* Full-width chrome: logo + wordmark span the whole viewport, including above the sidebar */}
      <Topbar onLogout={handleLogout} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="hidden min-h-0 lg:flex">
          <Sidebar />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-20 lg:p-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav onExploreClick={() => setExploreOpen(true)} showTasks={showTasks} />
      <MobileExploreSheet open={exploreOpen} onClose={() => setExploreOpen(false)} />
      <Footer />
    </div>
  )
}




