import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 rounded bg-surface',
            'bg-gradient-to-r from-surface via-surface-hover to-surface',
            'bg-[length:200%_100%] animate-skeleton-shimmer',
            i === lines - 1 && lines > 1 && 'w-3/4',
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-background-raised p-4 space-y-3', className)}>
      <Skeleton lines={1} className="w-1/3" />
      <Skeleton lines={3} />
    </div>
  )
}
