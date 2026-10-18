import { cn } from '@/lib/utils'

interface DiffViewerProps {
  diff: string
}

export function DiffViewer({ diff }: DiffViewerProps) {
  if (!diff) {
    return (
      <div className="p-8 text-center text-xs text-text-muted italic">
        No suggested patch or unified diff available for this investigation.
      </div>
    )
  }

  const lines = diff.split('\n')

  return (
    <div className="border border-border rounded-md bg-black/60 overflow-x-auto max-h-[calc(100vh-320px)] font-mono text-[11px] leading-relaxed">
      <div className="p-2 space-y-0.5">
        {lines.map((line, idx) => {
          let lineType: 'add' | 'del' | 'header' | 'normal' = 'normal'
          if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
            lineType = 'header'
          } else if (line.startsWith('+')) {
            lineType = 'add'
          } else if (line.startsWith('-')) {
            lineType = 'del'
          }

          return (
            <div
              key={idx}
              className={cn(
                'flex items-center px-2 py-0.5 rounded text-[11px]',
                lineType === 'add' && 'bg-emerald-500/15 text-emerald-300 font-medium',
                lineType === 'del' && 'bg-rose-500/15 text-rose-300 line-through opacity-80',
                lineType === 'header' && 'text-accent font-semibold bg-accent/5',
                lineType === 'normal' && 'text-text-secondary'
              )}
            >
              <pre className="whitespace-pre font-mono">{line || ' '}</pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}
