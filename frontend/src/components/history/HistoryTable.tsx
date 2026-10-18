import { Badge } from '@/components/ui/Badge'
import { formatTimestamp } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import type { Investigation } from '@/types'

interface HistoryTableProps {
  investigations: Investigation[]
  selectedId: string | null
  onSelect: (inv: Investigation) => void
}

export function HistoryTable({
  investigations,
  selectedId,
  onSelect,
}: HistoryTableProps) {
  const getStatusBadge = (status: Investigation['status']) => {
    switch (status) {
      case 'complete':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Complete
          </Badge>
        )
      case 'running':
        return (
          <Badge variant="accent" className="gap-1 animate-pulse">
            <Clock className="h-3 w-3" /> Running
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="error" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="border border-border rounded-md overflow-hidden bg-surface/30">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface border-b border-border/80 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
          <tr>
            <th className="px-4 py-2.5">ID / Created</th>
            <th className="px-4 py-2.5">Incident Scenario</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Root Cause Summary</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {investigations.map((inv) => {
            const isSelected = selectedId === inv.id
            const rootCause =
              inv.result && 'root_cause' in inv.result
                ? inv.result.root_cause
                : inv.result && 'error' in inv.result
                ? inv.result.error
                : '—'

            return (
              <tr
                key={inv.id}
                onClick={() => onSelect(inv)}
                className={`cursor-pointer transition-colors hover:bg-surface/70 ${
                  isSelected ? 'bg-surface font-medium' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-mono text-text-primary text-[11px] font-medium">
                    {inv.id}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {formatTimestamp(inv.created_at)}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="font-medium text-text-primary">
                    {inv.incident_id || 'Custom Upload'}
                  </span>
                </td>

                <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>

                <td className="px-4 py-3 max-w-xs truncate text-text-secondary">
                  {rootCause}
                </td>

                <td className="px-4 py-3 text-right text-text-muted">
                  <ChevronRight className="h-4 w-4 inline-block opacity-60" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
