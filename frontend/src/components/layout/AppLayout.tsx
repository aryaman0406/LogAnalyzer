import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PageTransition } from './PageTransition'

export function AppLayout() {
  const location = useLocation()

  const titleMap: Record<string, string> = {
    '/investigate': 'Investigate Incident',
    '/logs': 'Log Explorer',
    '/code': 'Code & Diff Inspector',
    '/history': 'Investigation History',
    '/evaluation': 'Evaluation Matrix',
    '/model': 'Model Metrics',
  }

  const title = titleMap[location.pathname] || 'Workspace'

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex">
      <Sidebar />
      <main className="ml-56 max-md:ml-14 min-h-screen flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <section className="flex-1 min-h-0 p-6 max-md:p-4 overflow-y-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </section>
      </main>
    </div>
  )
}
