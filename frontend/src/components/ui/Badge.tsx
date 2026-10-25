import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warn' | 'accent' | 'secondary' | 'info'
  children: React.ReactNode
  className?: string
  dot?: boolean
  pulse?: boolean
}

const variants = {
  default: 'bg-surface text-text-secondary border-border',
  secondary: 'bg-surface text-text-primary border-border',
  success: 'bg-status-success-bg text-status-success border-status-success-border',
  error: 'bg-status-error-bg text-status-error border-status-error-border',
  warn: 'bg-status-warning-bg text-status-warning border-status-warning-border',
  info: 'bg-status-info-bg text-status-info border-status-info-border',
  accent: 'bg-accent/15 text-accent border-accent/30',
}

const dotColors = {
  default: 'bg-text-secondary',
  secondary: 'bg-text-primary',
  success: 'bg-status-success',
  error: 'bg-status-error',
  warn: 'bg-status-warning',
  info: 'bg-status-info',
  accent: 'bg-accent',
}

export function Badge({
  variant = 'default',
  children,
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-caption font-mono font-medium border select-none',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            dotColors[variant]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
