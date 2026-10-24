import { Badge } from '@/components/ui/Badge'
import { FileCode, FileText, GitCommit, ArrowUpRight, Activity, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Evidence } from '@/types'

interface EvidenceListProps {
  evidence: Evidence[]
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-xs text-text-muted italic py-2">
        No specific citations extracted.
      </div>
    )
  }

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'code':
        return <FileCode className="h-3.5 w-3.5 text-accent" />
      case 'log':
        return <FileText className="h-3.5 w-3.5 text-amber-400" />
      case 'git':
        return <GitCommit className="h-3.5 w-3.5 text-emerald-400" />
      case 'anomaly':
        return <Activity className="h-3.5 w-3.5 text-rose-400" />
      case 'rag':
        return <BookOpen className="h-3.5 w-3.5 text-purple-400" />
      default:
        return <FileText className="h-3.5 w-3.5 text-text-secondary" />
    }
  }

  return (
    <div className="space-y-2">
      {evidence.map((item, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/70 bg-surface/40 p-3 text-xs hover:bg-surface/70 transition-all space-y-1.5 group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-text-primary font-semibold truncate">
              {getEvidenceIcon(item.type as Evidence['type'])}
              <span className="truncate">{item.reference}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.source && (
                <span className="text-[10px] text-text-muted font-mono">
                  {item.source}
                </span>
              )}
              <Badge variant="secondary" className="uppercase text-[9px] px-2 py-0">
                {item.type}
              </Badge>
            </div>
          </div>

          <p className="text-text-secondary text-[11px] leading-relaxed">
            {item.detail}
          </p>

          {item.type === 'code' && (
            <div className="pt-1 flex items-center justify-end">
              <Link
                to={`/code?file=${encodeURIComponent(item.reference.split(':')[0])}`}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-accent hover:underline"
              >
                <span>View AST source</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {item.type === 'log' && (
            <div className="pt-1 flex items-center justify-end">
              <Link
                to={`/logs?q=${encodeURIComponent(item.reference)}`}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-accent hover:underline"
              >
                <span>Open in Logs</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
