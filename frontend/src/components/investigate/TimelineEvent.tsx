import { useState } from 'react'
import { motion } from 'framer-motion'
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
  Sparkles,
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

  const getEventCategory = (): { label: string; variant: 'default' | 'success' | 'error' | 'warn' | 'accent' | 'secondary' } => {
    switch (event.type) {
      case 'thought':
        return { label: 'AGENT ACTION', variant: 'accent' }
      case 'tool_call':
        return { label: 'TOOL CALL', variant: 'warn' }
      case 'tool_result':
        if (isAnomaly) return { label: 'ANOMALY RESULT', variant: 'error' }
        if (isRag) return { label: 'RAG RETRIEVAL', variant: 'accent' }
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
        return <BrainCircuit className="h-3.5 w-3.5 text-accent" />
      case 'tool_call':
        return <Wrench className="h-3.5 w-3.5 text-amber-400" />
      case 'tool_result':
        if (isAnomaly) return <Activity className="h-3.5 w-3.5 text-rose-400" />
        if (isRag) return <BookOpen className="h-3.5 w-3.5 text-purple-400" />
        return <Code2 className="h-3.5 w-3.5 text-emerald-400" />
      case 'final':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
      default:
        return <FileText className="h-3.5 w-3.5 text-text-secondary" />
    }
  }

  const getTitle = () => {
    switch (event.type) {
      case 'thought':
        return 'Agent Action & Reasoning'
      case 'tool_call':
        return `Invoke Tool: ${toolName || 'Tool'}`
      case 'tool_result':
        if (isAnomaly) return 'ML Sequence Anomaly Scoring'
        if (isRag) return 'Technical Documentation RAG Retrieval'
        return `Evidence Collected: ${toolName || 'Output'}`
      case 'final':
        return 'Final Root-Cause Diagnosis Synthesized'
      case 'error':
        return 'Execution Exception'
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative pl-7 pb-4 border-l transition-colors',
        isActive ? 'border-accent' : 'border-border/70',
        isLast ? 'border-transparent' : ''
      )}
    >
      {/* Node bullet */}
      <div
        className={cn(
          'absolute -left-[11px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-bg-raised text-xs transition-all shadow-sm',
          isActive
            ? 'border-accent text-accent ring-4 ring-accent/20 scale-110 shadow-[0_0_12px_hsl(var(--accent))]'
            : 'border-border/80 text-text-muted'
        )}
      >
        {getIcon()}
      </div>

      {/* Card Body */}
      <div
        className={cn(
          'rounded-xl border p-3.5 text-xs transition-all duration-200 bg-surface/40 hover:bg-surface/70 border-border/70 backdrop-blur-sm',
          isActive && 'border-accent/40 bg-surface/80 shadow-[0_0_20px_rgba(129,140,248,0.15)]'
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary text-[12px] tracking-tight">
              {getTitle()}
            </span>
            <Badge variant={getEventCategory().variant} className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0">
              {getEventCategory().label}
            </Badge>
            <span className="text-[10px] text-text-muted font-mono">
              Step {event.step}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-hover transition-colors"
              title="Copy payload"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-hover transition-colors flex items-center gap-1 text-[10px] font-mono"
            >
              <span>{expanded ? 'Hide' : 'RAW'}</span>
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Content snippet */}
        <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-3 font-normal whitespace-pre-wrap font-mono bg-bg-base/40 p-2 rounded-lg border border-border/40">
          {summaryText}
        </p>

        {/* Expanded RAW JSON */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2.5 pt-2 border-t border-border/60"
          >
            <pre className="font-mono text-[10px] text-text-muted/90 bg-black/60 p-3 rounded-lg overflow-x-auto max-h-56 leading-relaxed border border-border/40">
              {contentText}
            </pre>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
