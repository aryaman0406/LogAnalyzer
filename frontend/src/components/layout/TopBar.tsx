import { useTheme } from '@/lib/hooks/useTheme'
import { Kbd } from '@/components/ui/Kbd'
import { Search, Sun, Moon, Sparkles, Terminal } from 'lucide-react'

interface TopBarProps {
  title: string
  breadcrumb?: string
}

export function TopBar({ title, breadcrumb = 'Cluster' }: TopBarProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="h-14 border-b border-border/80 bg-bg-base/60 backdrop-blur-xl flex items-center justify-between px-6 max-md:px-4 flex-shrink-0 sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-muted font-medium">{breadcrumb}</span>
        <span className="text-border-hover select-none">/</span>
        <span className="text-text-primary font-semibold tracking-tight">{title}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2.5">
        {/* Raycast-style Search / Command Palette trigger */}
        <div className="hidden sm:flex items-center gap-2.5 h-8 w-64 px-3 border border-border/70 rounded-lg text-xs text-text-muted bg-surface/40 hover:bg-surface hover:border-border-hover hover:text-text-primary transition-all cursor-pointer shadow-sm">
          <Search size={14} className="text-text-muted" />
          <span className="text-[11px]">Command palette...</span>
          <Kbd className="ml-auto text-[10px]">⌘K</Kbd>
        </div>

        {/* Live Traffic / Diagnostics Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-surface/30 text-[11px] text-text-secondary">
          <Terminal size={13} className="text-accent" />
          <span className="font-mono text-[10px]">API: localhost:8000</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors border border-border/50 bg-surface/30 cursor-pointer"
          title="Toggle theme"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Quick Help / AI Status */}
        <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
          <Sparkles size={15} />
        </div>
      </div>
    </header>
  )
}
