import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { LogLine } from '@/types'

interface LogViewerProps {
  logs: LogLine[]
}

export function LogViewer({ logs }: LogViewerProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  const getLevelVariant = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
      case 'FATAL':
        return 'error'
      case 'WARN':
      case 'WARNING':
        return 'warn'
      case 'INFO':
        return 'accent'
      case 'DEBUG':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  // Scroll to cited line if present
  useEffect(() => {
    const firstCited = logs.find((l) => l.cited)
    if (firstCited) {
      setSelectedLine(firstCited.line_number)
    }
  }, [logs])

  return (
    <div
      className="font-mono text-[11px] leading-relaxed select-text overflow-y-auto max-h-[calc(100vh-280px)] border border-border rounded-md bg-black/40 divide-y divide-border/40"
    >
      {logs.map((log) => {
        const isSelected = selectedLine === log.line_number
        const isError = ['ERROR', 'CRITICAL', 'FATAL'].includes(log.level?.toUpperCase())

        return (
          <div
            key={log.line_number}
            onClick={() => setSelectedLine(isSelected ? null : log.line_number)}
            className={cn(
              'flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 px-3 py-2 sm:py-1.5 cursor-pointer transition-colors hover:bg-surface/60',
              log.cited && 'bg-accent/10 border-l-2 border-l-accent',
              isSelected && 'bg-surface border-l-2 border-l-accent-hover',
              isError && !log.cited && !isSelected && 'bg-error/5'
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Line number */}
              <span className="w-10 sm:w-12 sm:text-right shrink-0 text-text-muted select-none">
                {log.line_number}
              </span>

              {/* Timestamp */}
              <span className="sm:w-36 shrink-0 text-text-secondary select-none truncate max-w-[160px] sm:max-w-none">
                {log.timestamp}
              </span>

              {/* Level badge */}
              <span className="sm:w-16 shrink-0">
                <Badge
                  variant={getLevelVariant(log.level) as 'error' | 'warn' | 'accent' | 'secondary'}
                  className="text-[9px] px-1.5 py-0 uppercase"
                >
                  {log.level}
                </Badge>
              </span>
            </div>

            <span className="flex-1 text-text-primary whitespace-pre-wrap break-all">
              {log.message}
            </span>
          </div>
        )
      })}
    </div>
  )
}
