import { TimelineEvent } from '@/components/investigate/TimelineEvent'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { Button } from '@/components/ui/button'
import { Code2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Investigation, InvestigationReport } from '@/types'

interface TraceReplayProps {
  investigation: Investigation
  onClose?: () => void
}

export function TraceReplay({ investigation, onClose }: TraceReplayProps) {
  const isReport =
    investigation.result && 'root_cause' in investigation.result
      ? (investigation.result as InvestigationReport)
      : null

  return (
    <div className="surface-card p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Trace Replay: <span className="font-mono text-sm">{investigation.id}</span>
          </h2>
          <p className="text-caption text-text-muted font-mono mt-0.5">
            Target Scenario: {investigation.incident_id || 'Direct Log Analysis'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/code?id=${investigation.id}`}>
            <Button variant="secondary" size="sm" className="gap-1.5 text-sm h-8">
              <Code2 className="h-4 w-4" />
              <span>Inspect Code</span>
            </Button>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface border border-border"
              aria-label="Close trace replay"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Result summary card */}
      {isReport && (
        <div className="p-4 rounded bg-background border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-muted font-mono">
              Diagnosis Result
            </span>
            <div className="w-36">
              <ConfidenceMeter
                value={isReport.confidence}
                label="Confidence"
                basis={isReport.confidence_basis}
              />
            </div>
          </div>
          <p className="text-base text-text-primary leading-relaxed font-semibold">
            {isReport.root_cause}
          </p>
        </div>
      )}

      {/* Step by step vertical timeline */}
      <div className="space-y-2 pt-2">
        <div className="text-caption font-semibold uppercase tracking-wider text-text-muted font-mono mb-2">
          Recorded Execution Steps ({investigation.trace?.length || 0})
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
          <div className="text-sm text-text-muted italic py-4 text-center">
            No trace events recorded for this session.
          </div>
        )}
      </div>
    </div>
  )
}
