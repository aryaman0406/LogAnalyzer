import { useEffect, useRef } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { TimelineEvent } from './TimelineEvent'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Terminal, Activity, Sparkles, Clock3 } from 'lucide-react'
import type { SSEEvent } from '@/types'

interface AgentTimelineProps {
  events: SSEEvent[]
  running: boolean
  elapsed: number
  investigationId: string | null
}

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
    <GlassCard className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] overflow-hidden" hover={false}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-surface/20">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Terminal size={13} />
          </div>
          <span className="font-semibold text-xs text-text-primary tracking-tight">
            Agent Reasoning Stream
          </span>
          {investigationId && (
            <Badge variant="secondary" className="font-mono text-[9px] truncate max-w-[140px]">
              {investigationId.slice(0, 8)}...
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {running ? (
            <Badge variant="accent" dot pulse>
              REASONING LIVE
            </Badge>
          ) : (
            events.length > 0 && (
              <Badge variant="success" dot>
                {toolCount} TOOLS CALLED
              </Badge>
            )
          )}
          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted bg-surface/60 px-2 py-0.5 rounded-md border border-border/50">
            <Clock3 size={11} />
            <span>{elapsed > 0 ? `${elapsed}s` : '0s'}</span>
          </div>
        </div>
      </div>

      {/* Events stream */}
      <div className="flex-1 overflow-y-auto p-5 space-y-1">
        {events.length === 0 && !running ? (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={Activity}
              title="Ready for Investigation"
              description="Choose an incident scenario on the left and click 'Run Autonomous Agent' to watch real-time tool calls and reasoning."
            />
          </div>
        ) : (
          <>
            {events.map((event, idx) => (
              <TimelineEvent
                key={`${event.step}-${idx}`}
                event={event}
                isLast={idx === events.length - 1}
                isActive={running && idx === events.length - 1}
              />
            ))}

            {running && (
              <div className="pl-7 pt-2 flex items-center gap-2 text-xs text-accent font-mono animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating next action & executing tools...</span>
              </div>
            )}
            <div ref={scrollEndRef} />
          </>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-5 py-2.5 border-t border-border/60 bg-surface/20 flex items-center justify-between text-[10px] font-mono text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Stream protocol: SSE / TextDecoder</span>
        </span>
        <span>Bounded loop: Max 15 steps</span>
      </div>
    </GlassCard>
  )
}
