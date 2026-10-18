import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Activity,
  Workflow,
  Terminal,
  FileCode2,
  History,
  BarChart3,
  Cpu,
  Settings2,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { to: '/investigate', label: 'Investigate', icon: Workflow, kbd: '⌘1' },
  { to: '/logs', label: 'Log Explorer', icon: Terminal, kbd: '⌘2' },
  { to: '/code', label: 'Code & Diff', icon: FileCode2, kbd: '⌘3' },
  { to: '/history', label: 'Audit History', icon: History, kbd: '⌘4' },
  { to: '/evaluation', label: 'Evaluation Matrix', icon: BarChart3, kbd: '⌘5' },
  { to: '/model', label: 'Model Metrics', icon: Cpu, kbd: '⌘6' },
]

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 border-r border-border/80 bg-bg-raised/70 backdrop-blur-2xl z-30 flex flex-col px-3.5 py-4 max-md:w-16 max-md:px-2 shadow-[1px_0_15px_rgba(0,0,0,0.3)]">
      {/* Brand */}
      <NavLink
        to="/"
        className="flex items-center gap-3 px-2.5 py-2 mb-4 rounded-lg hover:bg-surface/60 transition-colors no-underline group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/40 flex items-center justify-center text-accent flex-shrink-0 shadow-[0_0_15px_rgba(129,140,248,0.25)] group-hover:scale-105 transition-transform">
          <Activity size={18} />
        </div>
        <div className="flex flex-col min-w-0 max-md:hidden">
          <span className="text-xs font-bold tracking-tight text-text-primary flex items-center gap-1.5">
            <span>Incident Agent</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent/15 text-accent border border-accent/30">
              PRO
            </span>
          </span>
          <span className="text-[10px] text-text-muted font-mono truncate">
            Autonomous Debugger
          </span>
        </div>
      </NavLink>

      {/* Workspace Indicator */}
      <div className="flex items-center gap-2 h-8 px-2.5 mb-4 border border-border/60 rounded-lg text-xs text-text-secondary bg-surface/30 backdrop-blur-sm max-md:hidden">
        <span className="pulse-dot bg-emerald-400" />
        <span className="text-[11px] font-medium text-text-primary truncate">Production Cluster (US-East)</span>
      </div>

      {/* Nav label */}
      <span className="text-[9px] font-mono font-semibold tracking-wider text-text-muted px-2.5 pb-2 uppercase max-md:hidden">
        Navigation
      </span>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ to, label, icon: Icon, kbd }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 h-9 px-2.5 rounded-lg text-xs font-medium text-text-secondary',
                'transition-all duration-150 no-underline',
                'hover:bg-surface/80 hover:text-text-primary',
                'max-md:justify-center max-md:px-0',
                isActive &&
                  'bg-surface text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-border/70 font-semibold'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3.5 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
                )}
                <Icon
                  size={16}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'
                  )}
                />
                <span className="max-md:hidden truncate">{label}</span>
                {kbd && (
                  <kbd className="ml-auto text-[10px] font-mono text-text-muted/70 bg-bg-base/60 px-1.5 py-0.5 rounded border border-border/40 max-md:hidden">
                    {kbd}
                  </kbd>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto pt-3 border-t border-border/60 space-y-2">
        {/* Status Pill */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface/40 border border-border/40 text-[10px] text-text-secondary max-md:hidden">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-accent animate-pulse" />
            <span className="font-mono text-text-muted">Agent Engine</span>
          </div>
          <span className="font-mono text-emerald-400 font-semibold">ACTIVE</span>
        </div>

        {/* Workspace Settings */}
        <button className="flex items-center gap-2.5 h-8 w-full px-2.5 rounded-lg text-xs text-text-secondary hover:bg-surface/80 hover:text-text-primary transition-colors max-md:justify-center max-md:px-0 border-0 bg-transparent cursor-pointer">
          <Settings2 size={15} />
          <span className="max-md:hidden">Settings & Keys</span>
        </button>
      </div>
    </aside>
  )
}
