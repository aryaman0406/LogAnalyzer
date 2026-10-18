import { GlassCard } from '@/components/ui/GlassCard'
import { TimelineEvent } from '@/components/investigate/TimelineEvent'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { Button } from '@/components/ui/button'
import { Code2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Investigation, InvestigationReport } from '@/types'

interface TraceReplayProps {
  investigation: Investigation
  onClose?: () => void
}

export function TraceReplay({ investigation }: TraceReplayProps) {
  const isReport =
    investigation.result && 'root_cause' in investigation.result
      ? (investigation.result as InvestigationReport)
      : null

  return (
    <GlassCard className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Trace Replay: {investigation.id}
          </h2>
          <p className="text-[11px] text-text-muted">
            Target Scenario: {investigation.incident_id || 'Direct Log Analysis'}
          </p>
        </div>

        <Link to={`/code?id=${investigation.id}`}>
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
            <Code2 className="h-3.5 w-3.5" />
            <span>Open in Code Diff</span>
          </Button>
        </Link>
      </div>

      {/* Result summary if available */}
      {isReport && (
        <div className="p-3 rounded-md bg-surface/50 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Diagnosis Result
            </span>
            <div className="w-28">
              <ConfidenceMeter value={isReport.confidence ?? 0.85} />
            </div>
          </div>
          <p className="text-xs text-text-primary leading-relaxed font-normal">
            {isReport.root_cause}
          </p>
        </div>
      )}

      {/* Step by step timeline */}
      <div className="space-y-1 pt-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
          Recorded Execution Events ({investigation.trace?.length || 0})
        </div>

        {investigation.trace && investigation.trace.length > 0 ? (
          investigation.trace.map((ev, idx) => (
            <TimelineEvent
              key={idx}
              event={ev}
              isLast={idx === investigation.trace.length - 1}
            />
          ))
        ) : (
          <div className="text-xs text-text-muted italic py-4 text-center">
            No trace events recorded for this session.
          </div>
        )}
      </div>
    </GlassCard>
  )
}
