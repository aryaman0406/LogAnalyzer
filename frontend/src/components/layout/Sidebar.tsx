import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Workflow,
  History,
  Activity,
  Terminal,
  FileCode2,
  BarChart3,
  Cpu,
  Layers,
} from 'lucide-react'

interface SidebarProps {
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

const navItems = [
  { to: '/investigate', label: 'Investigate', icon: Workflow, badge: null },
  { to: '/history', label: 'History & Replay', icon: History, badge: null },
  { to: '/logs', label: 'Log Explorer', icon: Terminal, badge: null },
  { to: '/code', label: 'Code & AST', icon: FileCode2, badge: null },
  { to: '/evaluation', label: 'Evaluation', icon: BarChart3, badge: null },
  { to: '/model', label: 'ML Status', icon: Cpu, badge: null },
]

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-background-raised border-r border-border z-50 flex flex-col transition-transform duration-200 ease-out',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between">
          <NavLink
            to="/investigate"
            onClick={onCloseMobile}
            className="flex items-center gap-3 no-underline text-text-primary group"
          >
            <div className="w-8 h-8 rounded bg-accent/15 border border-accent/40 flex items-center justify-center text-accent">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-text-primary flex items-center gap-1.5">
                Incident Console
              </span>
              <span className="text-caption text-text-muted font-mono">
                Log Analyzer v1.0
              </span>
            </div>
          </NavLink>
        </div>

        {/* Section Navigation */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-caption font-semibold uppercase tracking-wider text-text-muted font-mono">
            Platform Navigation
          </div>

          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors no-underline select-none',
                    isActive
                      ? 'bg-surface text-text-primary border border-border font-semibold shadow-sm'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-accent' : 'text-text-muted'
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className="ml-auto text-caption font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* System Heartbeat Footer */}
        <div className="p-4 border-t border-border bg-background-overlay/40 space-y-2">
          <div className="flex items-center justify-between text-caption font-mono">
            <span className="text-text-muted flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-status-success" />
              <span>Core Engine</span>
            </span>
            <span className="text-status-success font-semibold">ONLINE</span>
          </div>
          <div className="text-caption text-text-muted">
            Workspace: <span className="text-text-secondary font-mono">Local Repo</span>
          </div>
        </div>
      </aside>
    </>
  )
}
