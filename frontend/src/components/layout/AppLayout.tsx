import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PageTransition } from './PageTransition'

export function AppLayout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const titleMap: Record<string, string> = {
    '/investigate': 'Incident Investigation',
    '/logs': 'Log Explorer',
    '/code': 'Code & Diff Inspector',
    '/history': 'Audit History & Replay',
    '/evaluation': 'Evaluation Matrix',
    '/model': 'ML Service Status',
  }

  const title = titleMap[location.pathname] || 'Workspace'

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 min-h-screen">
        <TopBar title={title} onOpenMobile={() => setMobileOpen(true)} />
        <section className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[1280px] w-full mx-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </section>
      </main>
    </div>
  )
}
