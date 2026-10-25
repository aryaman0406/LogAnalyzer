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
            <CheckCircle2 className="h-3.5 w-3.5" /> Complete
          </Badge>
        )
      case 'running':
        return (
          <Badge variant="warn" className="gap-1 animate-pulse">
            <Clock className="h-3.5 w-3.5" /> Running
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="error" className="gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Failed
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="border border-border rounded overflow-hidden bg-background">
      {/* Desktop / Tablet Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface border-b border-border text-caption uppercase font-semibold text-text-muted font-mono tracking-wider">
            <tr>
              <th className="px-4 py-3">ID / Timestamp</th>
              <th className="px-4 py-3">Scenario</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Root Cause Diagnosis</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-surface font-medium' : 'hover:bg-surface/50'
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-mono text-text-primary text-sm font-semibold">
                      {inv.id}
                    </div>
                    <div className="text-caption text-text-muted mt-0.5 font-mono">
                      {formatTimestamp(inv.created_at)}
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="font-medium text-text-primary text-sm">
                      {inv.incident_id || 'Custom Log'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">{getStatusBadge(inv.status)}</td>

                  <td className="px-4 py-3.5 max-w-sm truncate text-text-secondary text-sm">
                    {rootCause}
                  </td>

                  <td className="px-4 py-3.5 text-right text-text-muted">
                    <ChevronRight className="h-4 w-4 inline-block opacity-70" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile 390px Card List View */}
      <div className="sm:hidden divide-y divide-border">
        {investigations.map((inv) => {
          const isSelected = selectedId === inv.id
          const rootCause =
            inv.result && 'root_cause' in inv.result
              ? inv.result.root_cause
              : inv.result && 'error' in inv.result
              ? inv.result.error
              : '—'

          return (
            <div
              key={inv.id}
              onClick={() => onSelect(inv)}
              className={`p-4 space-y-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-surface font-medium' : 'hover:bg-surface/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {inv.id}
                </span>
                {getStatusBadge(inv.status)}
              </div>

              <div className="flex items-center justify-between text-caption font-mono text-text-muted">
                <span>{inv.incident_id || 'Custom Log'}</span>
                <span>{formatTimestamp(inv.created_at)}</span>
              </div>

              <p className="text-sm text-text-secondary line-clamp-2">
                {rootCause}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
