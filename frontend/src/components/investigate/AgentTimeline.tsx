import { useEffect, useRef } from 'react'
import { TimelineEvent } from './TimelineEvent'
import { Badge } from '@/components/ui/Badge'
import { Clock3, PlayCircle, Loader2 } from 'lucide-react'
import type { SSEEvent } from '@/types'

interface AgentTimelineProps {
  events: SSEEvent[]
  running: boolean
  elapsed: number
  investigationId: string | null
}

const RUNNING_PHASES = [
  { name: 'ML Ranking', desc: 'Predicting suspect failure lines' },
  { name: 'Log & Code Retrieval', desc: 'Searching AST and incident context' },
  { name: 'Agent Reasoning', desc: 'Evaluating diagnostic hypotheses' },
  { name: 'Synthesis & Validation', desc: 'Drafting grounded diagnosis & patch' },
]

export function AgentTimeline({
  events,
  running,
  elapsed,
  investigationId,
}: AgentTimelineProps) {
  const scrollEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (running && scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events.length, running])

  const toolCount = events.filter((e) => e.type === 'tool_call').length

  return (
    <div className="surface-card flex flex-col h-full min-h-[500px] overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-border bg-background-overlay/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-text-primary m-0">
            Investigation Progress & Trace
          </h2>
          {investigationId && (
            <Badge variant="secondary" className="font-mono text-caption truncate max-w-[140px]">
              {investigationId.slice(0, 8)}...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {running ? (
            <Badge variant="warn" dot>
              RUNNING
            </Badge>
          ) : (
            events.length > 0 && (
              <Badge variant="success" dot>
                {toolCount} TOOLS CALLED
              </Badge>
            )
          )}
          <div className="flex items-center gap-1.5 text-caption font-mono text-text-muted bg-surface px-2.5 py-1 rounded border border-border">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="tabular-nums">{elapsed > 0 ? `${elapsed}s` : '0s'}</span>
          </div>
        </div>
      </div>

      {/* Body: Stream or Running Skeletons or Empty State */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4">
        {events.length === 0 && !running ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-12 w-12 rounded bg-surface border border-border flex items-center justify-center text-text-muted">
              <PlayCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold text-text-primary">Investigation Idle</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Select an incident scenario or paste log data and click <strong>Run Investigation</strong> to begin autonomous root cause analysis.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* If running, show Phase Timeline with Skeletons */}
            {running && (
              <div className="p-4 rounded border border-border bg-background-overlay/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span>Autonomous Execution in Progress</span>
                  </div>
                  <span className="text-caption font-mono text-text-muted tabular-nums">
                    Elapsed: {elapsed}s
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {RUNNING_PHASES.map((phase, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded bg-surface border border-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-caption font-mono">
                        <span className="font-semibold text-text-primary">
                          {idx + 1}. {phase.name}
                        </span>
                        <span className="text-text-muted">
                          {idx <= Math.min(Math.floor(elapsed / 4), 3) ? 'ACTIVE' : 'QUEUED'}
                        </span>
                      </div>
                      <p className="text-caption text-text-muted">
                        {phase.desc}
                      </p>
                      {/* Linear skeleton shimmer bar */}
                      <div className="h-1.5 w-full rounded bg-background overflow-hidden border border-border/50">
                        <div
                          className={`h-full bg-accent ${
                            idx <= Math.min(Math.floor(elapsed / 4), 3)
                              ? 'w-full animate-pulse'
                              : 'w-1/4 opacity-30'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event items */}
            <div className="space-y-2 pt-2">
              {events.map((event, idx) => (
                <TimelineEvent
                  key={`${event.step}-${idx}`}
                  event={event}
                  isLast={idx === events.length - 1}
                  isActive={running && idx === events.length - 1}
                />
              ))}
            </div>

            <div ref={scrollEndRef} />
          </>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-5 py-2.5 border-t border-border bg-background-overlay/40 flex items-center justify-between text-caption font-mono text-text-muted">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-status-success" />
          <span>Real-time Stream: Active</span>
        </span>
        <span>Max Safety Steps: 15</span>
      </div>
    </div>
  )
}
