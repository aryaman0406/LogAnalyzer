import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warn' | 'accent' | 'secondary'
  children: React.ReactNode
  className?: string
  dot?: boolean
  pulse?: boolean
}

const variants = {
  default: 'bg-surface/80 text-text-secondary border-border/80',
  secondary: 'bg-surface text-text-secondary border-border',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  accent: 'bg-accent/15 text-accent border-accent/30',
}

const dotColors = {
  default: 'bg-text-secondary',
  secondary: 'bg-text-secondary',
  success: 'bg-emerald-400',
  error: 'bg-rose-400',
  warn: 'bg-amber-400',
  accent: 'bg-accent',
}

export function Badge({
  variant = 'default',
  children,
  className,
  dot,
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-tight border backdrop-blur-sm select-none',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColors[variant],
            pulse && 'pulse-dot'
          )}
        />
      )}
      {children}
    </span>
  )
}
