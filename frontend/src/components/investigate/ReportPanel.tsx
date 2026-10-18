import { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { EvidenceList } from './EvidenceList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Copy,
  Check,
  Code2,
  ShieldAlert,
  Sparkles,
  GitPullRequest,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InvestigationReport } from '@/types'

interface ReportPanelProps {
  report: InvestigationReport | null
  error: string | null
  investigationId: string | null
}

export function ReportPanel({ report, error, investigationId }: ReportPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyFix = () => {
    if (!report?.suggested_fix) return
    navigator.clipboard.writeText(report.suggested_fix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) {
    return (
      <GlassCard className="p-6 h-[calc(100vh-140px)] min-h-[550px] flex flex-col items-center justify-center text-center space-y-4" hover={false}>
        <div className="h-12 w-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="text-sm font-bold text-text-primary">Investigation Halted</h3>
          <p className="text-xs text-rose-400 leading-relaxed">{error}</p>
        </div>
      </GlassCard>
    )
  }

  if (!report) {
    return (
      <GlassCard className="p-6 h-[calc(100vh-140px)] min-h-[550px] flex flex-col items-center justify-center text-center space-y-4" hover={false}>
        <div className="h-12 w-12 rounded-2xl bg-surface/80 border border-border flex items-center justify-center text-text-muted shadow-sm">
          <FileCheck2 className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h3 className="text-sm font-bold text-text-primary">Awaiting Diagnosis</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Run an investigation to synthesize root causes, evaluate confidence scores, and preview unified patches.
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="h-[calc(100vh-140px)] min-h-[550px] flex flex-col overflow-hidden" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-surface/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={14} />
          </div>
          <span className="font-semibold text-xs text-text-primary tracking-tight">
            Root Cause Report
          </span>
        </div>
        {investigationId && (
          <Link
            to={`/code?id=${investigationId}`}
            className="text-[10px] font-mono font-semibold text-accent hover:underline flex items-center gap-1 bg-accent/10 px-2 py-0.5 rounded border border-accent/25"
          >
            <GitPullRequest className="h-3 w-3" />
            <span>Review Diff</span>
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Incident Summary Metadata Banner */}
        <div className="p-3.5 rounded-xl bg-surface/40 border border-border/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-text-primary px-2 py-0.5 rounded bg-surface border border-border">
                {report.incident_id || 'INCIDENT'}
              </span>
              <Badge
                variant={
                  (report.severity || 'high').toLowerCase() === 'critical'
                    ? 'error'
                    : (report.severity || 'high').toLowerCase() === 'high'
                    ? 'warn'
                    : 'secondary'
                }
                className="uppercase text-[10px] font-mono tracking-wider"
              >
                {report.severity || 'HIGH'} SEVERITY
              </Badge>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              Service: <span className="text-text-primary font-medium">{report.affected_service || 'sample_app'}</span>
            </span>
          </div>

          <ConfidenceMeter value={report.confidence ?? 0.88} />
        </div>

        {/* Root cause callout */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted">
            Root Cause Diagnosis
          </div>
          <div className="p-3.5 rounded-xl bg-surface/50 border-l-2 border-l-accent border-y border-r border-border/70 text-xs text-text-primary leading-relaxed font-normal whitespace-pre-wrap shadow-sm">
            {report.root_cause}
          </div>
        </div>

        {/* Affected Component */}
        {(report.affected_file || report.affected_function) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {report.affected_file && (
              <div className="p-2.5 rounded-xl bg-surface/30 border border-border/60">
                <span className="text-[9px] font-mono uppercase text-text-muted block">
                  Affected File
                </span>
                <span className="font-mono text-[11px] text-text-primary font-semibold truncate block mt-0.5">
                  {report.affected_file}
                </span>
              </div>
            )}
            {report.affected_function && (
              <div className="p-2.5 rounded-xl bg-surface/30 border border-border/60">
                <span className="text-[9px] font-mono uppercase text-text-muted block">
                  Affected Function
                </span>
                <span className="font-mono text-[11px] text-accent font-semibold truncate block mt-0.5">
                  {report.affected_function}()
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cited Evidence */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted flex items-center justify-between">
            <span>Cited Evidence</span>
            <span>{report.evidence?.length || 0} citations</span>
          </div>
          <EvidenceList evidence={report.evidence} />
        </div>

        {/* Suggested Fix */}
        {report.suggested_fix && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                Proposed Patch / Fix
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyFix}
                className="h-6 px-2 text-[10px] font-mono gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="font-mono text-[11px] leading-relaxed p-3 rounded-xl bg-black/60 border border-border/70 text-text-primary overflow-x-auto max-h-52">
              {report.suggested_fix}
            </pre>
          </div>
        )}

        {/* Hallucination / Validation Warnings */}
        {report.hallucination_warnings && report.hallucination_warnings.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <ShieldAlert className="h-4 w-4" />
              <span>Groundedness Guardrail Warning</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-0.5 font-mono">
              {report.hallucination_warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
