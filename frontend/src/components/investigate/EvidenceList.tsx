import { FileCode, FileText, GitCommit, Activity, BookOpen, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import type { Evidence } from '@/types'

interface EvidenceListProps {
  evidence: Evidence[]
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-sm text-text-muted italic py-3 px-4 rounded bg-surface border border-border">
        No specific evidence items cited for this incident.
      </div>
    )
  }

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'code':
        return <FileCode className="h-4 w-4 text-accent" />
      case 'log':
        return <FileText className="h-4 w-4 text-status-warning" />
      case 'git':
        return <GitCommit className="h-4 w-4 text-status-success" />
      case 'anomaly':
        return <Activity className="h-4 w-4 text-status-error" />
      case 'rag':
        return <BookOpen className="h-4 w-4 text-status-info" />
      default:
        return <FileText className="h-4 w-4 text-text-secondary" />
    }
  }

  return (
    <div className="space-y-2">
      {evidence.map((item, idx) => (
        <div
          key={idx}
          className="rounded border border-border bg-surface p-3.5 text-sm space-y-2 hover:border-border-hover transition-colors"
        >
          {/* Header: Icon, Monospace Chip Reference, and Type Badge */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{getEvidenceIcon(item.type as Evidence['type'])}</span>
              <span className="font-mono text-sm font-semibold text-text-primary px-2 py-0.5 rounded bg-background border border-border truncate">
                {item.reference}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {item.source && (
                <span className="text-caption font-mono text-text-muted">
                  {item.source}
                </span>
              )}
              <Badge variant="secondary" className="uppercase">
                {item.type}
              </Badge>
            </div>
          </div>

          {/* Excerpt / Detail (14px secondary text, 1.5 line height) */}
          <p className="text-sm text-text-secondary leading-relaxed font-normal">
            {item.detail}
          </p>

          {/* Action Links */}
          {item.type === 'code' && (
            <div className="pt-1 flex items-center justify-end">
              <Link
                to={`/code?file=${encodeURIComponent(item.reference.split(':')[0])}`}
                className="inline-flex items-center gap-1.5 text-caption font-mono text-accent hover:underline"
              >
                <span>View file & diff</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}

          {item.type === 'log' && (
            <div className="pt-1 flex items-center justify-end">
              <Link
                to={`/logs?q=${encodeURIComponent(item.reference)}`}
                className="inline-flex items-center gap-1.5 text-caption font-mono text-accent hover:underline"
              >
                <span>Find in logs</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
