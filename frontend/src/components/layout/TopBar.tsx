import { useTheme } from '@/lib/hooks/useTheme'
import { Sun, Moon, Cpu, Bot, Menu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchModelStatus } from '@/lib/api'

interface TopBarProps {
  title: string
  onOpenMobile?: () => void
}

export function TopBar({ title, onOpenMobile }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()
  const { data: statusData } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: fetchModelStatus,
    refetchInterval: 15000,
  })

  const mlHealthy = statusData?.anomaly_detector?.available
  const mlStatusText = mlHealthy ? 'ML Online' : 'ML Offline'

  return (
    <header className="h-16 border-b border-border bg-background-raised sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface border border-border"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-text-muted hidden sm:inline">incident-console</span>
          <span className="text-sm font-mono text-text-muted hidden sm:inline">/</span>
          <h1 className="text-base font-semibold text-text-primary m-0 tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Badges & Theme Toggle */}
      <div className="flex items-center gap-2.5">
        {/* Active LLM Provider / Model Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-surface border border-border text-sm font-mono">
          <Bot className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <span className="text-caption text-text-muted uppercase">Provider:</span>
          <span className="text-text-primary font-semibold">Gemini Flash</span>
        </div>

        {/* ML Service Health Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-surface border border-border text-sm font-mono">
          <Cpu className="h-4 w-4 text-text-muted shrink-0" aria-hidden="true" />
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              mlHealthy ? 'bg-status-success' : 'bg-status-warning'
            }`}
          />
          <span
            className={
              mlHealthy
                ? 'text-status-success font-semibold text-caption'
                : 'text-status-warning font-semibold text-caption'
            }
          >
            {mlStatusText}
          </span>
        </div>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}
