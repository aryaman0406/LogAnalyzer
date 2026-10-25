import { useState } from 'react'
import {
  BrainCircuit,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Copy,
  Check,
  BookOpen,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { SSEEvent } from '@/types'

interface TimelineEventProps {
  event: SSEEvent
  isLast?: boolean
  isActive?: boolean
}

export function TimelineEvent({ event, isLast = false, isActive = false }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const toolName =
    (event.content as { name?: string; tool?: string })?.name ||
    (event.content as { name?: string; tool?: string })?.tool ||
    ''
  const isAnomaly = toolName === 'detect_anomalies'
  const isRag = toolName === 'search_docs'

  const getEventCategory = (): { label: string; variant: 'default' | 'success' | 'error' | 'warn' | 'accent' | 'secondary' | 'info' } => {
    switch (event.type) {
      case 'thought':
        return { label: 'AGENT ACTION', variant: 'accent' }
      case 'tool_call':
        return { label: 'TOOL CALL', variant: 'warn' }
      case 'tool_result':
        if (isAnomaly) return { label: 'ANOMALY RESULT', variant: 'error' }
        if (isRag) return { label: 'RAG RETRIEVAL', variant: 'info' }
        return { label: 'EVIDENCE', variant: 'success' }
      case 'final':
        return { label: 'FINAL DIAGNOSIS', variant: 'success' }
      case 'error':
        return { label: 'ERROR', variant: 'error' }
      default:
        return { label: 'EVENT', variant: 'secondary' }
    }
  }

  const getIcon = () => {
    switch (event.type) {
      case 'thought':
        return <BrainCircuit className="h-4 w-4 text-accent" />
      case 'tool_call':
        return <Wrench className="h-4 w-4 text-status-warning" />
      case 'tool_result':
        if (isAnomaly) return <Activity className="h-4 w-4 text-status-error" />
        if (isRag) return <BookOpen className="h-4 w-4 text-status-info" />
        return <Code2 className="h-4 w-4 text-status-success" />
      case 'final':
        return <CheckCircle2 className="h-4 w-4 text-status-success" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-status-error" />
      default:
        return <FileText className="h-4 w-4 text-text-secondary" />
    }
  }

  const getTitle = () => {
    switch (event.type) {
      case 'thought':
        return 'Agent Reasoning'
      case 'tool_call':
        return `Tool Call: ${toolName || 'Tool'}`
      case 'tool_result':
        if (isAnomaly) return 'ML Sequence Anomaly Scoring'
        if (isRag) return 'Technical Documentation RAG'
        return `Tool Result: ${toolName || 'Output'}`
      case 'final':
        return 'Final Root Cause Synthesis'
      case 'error':
        return 'Execution Error'
      default:
        return event.type
    }
  }

  const contentText =
    typeof event.content === 'string'
      ? event.content
      : JSON.stringify(event.content, null, 2)

  const summaryText =
    typeof event.content === 'object' && event.content !== null
      ? (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.preview ||
        (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.summary ||
        (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.thought ||
        (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.text ||
        (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.message ||
        (event.content as { preview?: string; summary?: string; text?: string; thought?: string; message?: string; error?: string })?.error ||
        JSON.stringify(event.content)
      : String(event.content)

  const handleCopy = () => {
    navigator.clipboard.writeText(contentText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'relative pl-7 pb-4 border-l transition-colors',
        isActive ? 'border-accent' : 'border-border',
        isLast ? 'border-transparent pb-1' : ''
      )}
    >
      {/* Node bullet */}
      <div
        className={cn(
          'absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background-raised text-sm transition-all',
          isActive
            ? 'border-accent text-accent ring-2 ring-accent/30'
            : 'border-border text-text-muted'
        )}
      >
        {getIcon()}
      </div>

      {/* Card Body */}
      <div
        className={cn(
          'rounded border p-3.5 text-sm transition-colors bg-surface border-border',
          isActive && 'border-accent/60 bg-background-overlay'
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary text-sm">
              {getTitle()}
            </span>
            <Badge variant={getEventCategory().variant} className="uppercase font-mono">
              {getEventCategory().label}
            </Badge>
            <span className="text-caption text-text-muted font-mono">
              Step {event.step}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover"
              title="Copy payload"
              aria-label="Copy event payload"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-0.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover flex items-center gap-1 text-caption font-mono border border-border"
              aria-label={expanded ? 'Collapse raw payload' : 'Expand raw payload'}
            >
              <span>{expanded ? 'Hide RAW' : 'View RAW'}</span>
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Content snippet */}
        <p className="text-text-secondary text-sm leading-relaxed font-mono bg-background p-2.5 rounded border border-border overflow-x-auto whitespace-pre-wrap">
          {summaryText}
        </p>

        {/* Expanded RAW JSON */}
        {expanded && (
          <div className="mt-2.5 pt-2 border-t border-border">
            <pre className="font-mono text-caption text-text-secondary bg-background p-3 rounded overflow-x-auto max-h-56 leading-relaxed border border-border">
              {contentText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
