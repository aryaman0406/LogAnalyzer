import { cn } from '@/lib/utils'

interface KbdProps {
  children: React.ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded',
        'text-[9px] font-mono font-medium',
        'bg-surface border border-border text-text-secondary',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
