import { cn } from '@/lib/utils'
import type { SourceFile } from '@/types'

interface CodeViewerProps {
  file: SourceFile | null
  highlightLines?: number[]
}

export function CodeViewer({ file, highlightLines = [] }: CodeViewerProps) {
  if (!file) {
    return (
      <div className="p-8 text-center text-xs text-text-muted italic">
        Select a file to inspect its source code.
      </div>
    )
  }

  return (
    <div className="border border-border rounded-md bg-black/50 overflow-x-auto max-h-[calc(100vh-320px)] font-mono text-[11px] leading-5">
      <div className="px-3 py-1.5 border-b border-border/80 bg-surface/50 text-[11px] text-text-secondary flex items-center justify-between">
        <span className="font-mono text-text-primary">{file.path}</span>
        <span className="text-[10px] text-text-muted">Lines {file.start_line}–{file.start_line + file.lines.length - 1}</span>
      </div>

      <div className="p-2 divide-y divide-transparent">
        {file.lines.map((line, idx) => {
          const lineNum = file.start_line + idx
          const isHighlighted = highlightLines.includes(lineNum)

          return (
            <div
              key={lineNum}
              className={cn(
                'flex items-start gap-4 px-2 py-0.5 rounded transition-colors hover:bg-surface/50',
                isHighlighted && 'bg-accent/15 border-l-2 border-l-accent text-accent'
              )}
            >
              <span className="w-10 shrink-0 text-right text-text-muted select-none">
                {lineNum}
              </span>
              <pre className="flex-1 text-text-primary font-mono whitespace-pre overflow-x-auto">
                {line || ' '}
              </pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}
