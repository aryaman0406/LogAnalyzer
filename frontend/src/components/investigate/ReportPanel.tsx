import { useState } from 'react'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { EvidenceList } from './EvidenceList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  GitPullRequest,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
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
  const [expandedLines, setExpandedLines] = useState<Record<number, boolean>>({})

  const handleCopyFix = () => {
    if (!report?.suggested_fix) return
    navigator.clipboard.writeText(report.suggested_fix)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleLineExpand = (idx: number) => {
    setExpandedLines((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  if (error) {
    return (
      <div className="surface-card p-6 h-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-12 w-12 rounded bg-status-error-bg border border-status-error-border flex items-center justify-center text-status-error">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-base font-semibold text-text-primary">Investigation Failed</h2>
          <p className="text-sm text-status-error leading-relaxed">{error}</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="surface-card p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center space-y-3">
        <div className="h-12 w-12 rounded bg-surface border border-border flex items-center justify-center text-text-muted">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-base font-semibold text-text-primary">Awaiting Investigation</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Run an investigation or select a past report from history to review synthesized root cause, citations, and ML line rankings.
          </p>
        </div>
      </div>
    )
  }

  // Set of cited line numbers from evidence for cross-referencing
  const citedLineNumbers = new Set<number>()
  if (report.evidence) {
    for (const ev of report.evidence) {
      const match = ev.reference.match(/(?:line|L)?\s*(\d+)/i)
      if (match && match[1]) {
        citedLineNumbers.add(parseInt(match[1], 10))
      }
    }
  }

  const severityVariant =
    (report.severity || 'high').toLowerCase() === 'critical'
      ? 'error'
      : (report.severity || 'high').toLowerCase() === 'high'
      ? 'warn'
      : 'secondary'

  return (
    <div className="surface-card flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-border bg-background-overlay/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-status-success" />
          <h2 className="text-base font-semibold text-text-primary m-0">
            Incident Diagnosis Report
          </h2>
        </div>

        {investigationId && (
          <Link
            to={`/code?id=${investigationId}`}
            className="text-caption font-mono font-medium text-accent hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface border border-border"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span>Code Diff</span>
          </Link>
        )}
      </div>

      {/* Report Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
        {/* Offline Fallback Prominent Calm Banner */}
        {report.llm_fallback?.used && (
          <div className="p-4 rounded border border-status-warning-border bg-status-warning-bg text-status-warning text-sm space-y-1.5">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Gemini unavailable. This diagnosis comes from the offline fallback and is not an LLM analysis.</span>
            </div>
            {report.llm_fallback.reason && (
              <p className="text-caption pl-7 opacity-90 font-mono">
                Reason: {report.llm_fallback.reason}
              </p>
            )}
          </div>
        )}

        {/* Top Summary Card: Headline Root Cause, Severity Pill, LLM Provider, Total Time */}
        <div className="p-5 rounded border border-border bg-background-overlay/60 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-sm text-text-primary px-2.5 py-1 rounded bg-surface border border-border">
                {report.incident_id || 'INCIDENT'}
              </span>
              <Badge variant={severityVariant} className="uppercase text-caption font-semibold">
                {report.severity || 'HIGH'} SEVERITY
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-caption font-mono text-text-muted">
              <span>
                Provider: <strong className="text-text-primary font-semibold">Gemini</strong>
              </span>
              <span>•</span>
              <span>
                Service: <strong className="text-text-primary font-semibold">{report.affected_service || 'sample_app'}</strong>
              </span>
            </div>
          </div>

          {/* Root Cause as the headline in large type (20-22px / 600) */}
          <div className="space-y-1.5">
            <div className="text-caption font-mono uppercase tracking-wider text-text-muted font-semibold">
              Root Cause Headline
            </div>
            <div className="text-xl font-semibold text-text-primary leading-snug">
              {report.root_cause}
            </div>
          </div>

          {/* Calibrated Confidence Label */}
          <ConfidenceMeter
            value={report.confidence}
            label="Diagnosis Confidence"
            basis={report.confidence_basis}
          />
        </div>

        {/* Suggested Fix Section */}
        {report.suggested_fix && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted font-mono">
                Suggested Patch / Remediation
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyFix}
                className="h-7 px-3 text-caption font-mono gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-status-success" />
                    <span className="text-status-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Fix</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="font-mono text-sm leading-relaxed p-4 rounded bg-background border border-border text-text-primary overflow-x-auto max-h-64">
              {report.suggested_fix}
            </pre>
          </div>
        )}

        {/* Evidence List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted font-mono">
              Cited Diagnostic Evidence
            </h3>
            <span className="text-caption font-mono text-text-muted">
              {report.evidence?.length || 0} citations
            </span>
          </div>
          <EvidenceList evidence={report.evidence} />
        </div>

        {/* ML Suspect Lines Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted font-mono">
              ML Suspect Lines Ranking
            </h3>
            {report.ml_ranking?.available && (
              <span className="text-caption font-mono text-status-success font-semibold">
                Model v{report.ml_ranking.model_version || '1.0'}
              </span>
            )}
          </div>

          {/* Prominent but calm ML Warnings */}
          {report.ml_ranking?.warnings && report.ml_ranking.warnings.length > 0 && (
            <div className="rounded border border-status-warning-border bg-status-warning-bg p-3.5 text-caption font-mono text-status-warning space-y-1">
              <div className="font-semibold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>ML Model Warning</span>
              </div>
              {report.ml_ranking.warnings.map((warn, i) => (
                <p key={i} className="pl-6 leading-relaxed">{warn}</p>
              ))}
            </div>
          )}

          {/* Ranked Table */}
          {report.ml_ranking?.available && report.ml_ranking.top_lines && report.ml_ranking.top_lines.length > 0 ? (
            <div className="border border-border rounded overflow-hidden bg-background">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-caption font-mono uppercase text-text-muted">
                  <tr>
                    <th className="px-3 py-2 w-16">Rank</th>
                    <th className="px-3 py-2 w-24">Line</th>
                    <th className="px-3 py-2 w-44">Score</th>
                    <th className="px-3 py-2">Log Content</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.ml_ranking.top_lines.slice(0, 10).map((line, idx) => {
                    const isCited = citedLineNumbers.has(line.line_no)
                    const isExpanded = !!expandedLines[idx]
                    const scorePct = Math.round(line.score * 100)

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isCited ? 'bg-accent/10 hover:bg-accent/15' : 'hover:bg-surface/50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2 font-mono text-caption text-text-muted">
                          #{idx + 1}
                        </td>

                        {/* Line number */}
                        <td className="px-3 py-2 font-mono text-sm font-semibold">
                          <span className={isCited ? 'text-accent' : 'text-text-primary'}>
                            L{line.line_no}
                          </span>
                          {isCited && (
                            <span className="block text-[11px] text-accent font-medium">
                              Cited
                            </span>
                          )}
                        </td>

                        {/* Score bar with numeric value */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-surface border border-border overflow-hidden">
                              <div
                                style={{ width: `${scorePct}%` }}
                                className="h-full rounded-full bg-accent"
                              />
                            </div>
                            <span className="font-mono text-caption tabular-nums text-text-secondary w-10 text-right">
                              {scorePct}%
                            </span>
                          </div>
                        </td>

                        {/* Log Text */}
                        <td className="px-3 py-2 font-mono text-caption text-text-secondary">
                          <div className={isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate max-w-md'}>
                            {line.text}
                          </div>
                        </td>

                        {/* Expand toggle */}
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => toggleLineExpand(idx)}
                            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface"
                            aria-label={isExpanded ? 'Collapse log line' : 'Expand log line'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border border-border bg-surface p-4 text-sm text-text-muted flex items-center justify-between">
              <span>ML suspect lines ranking unavailable for this run.</span>
              {report.ml_ranking?.reason && (
                <span className="font-mono text-caption text-text-muted">({report.ml_ranking.reason})</span>
              )}
            </div>
          )}
        </div>

        {/* Guardrail Validation Warnings */}
        {report.hallucination_warnings && report.hallucination_warnings.length > 0 && (
          <div className="p-4 rounded border border-status-warning-border bg-status-warning-bg space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-status-warning">
              <AlertTriangle className="h-4 w-4" />
              <span>Groundedness Guardrail Advisory</span>
            </div>
            <ul className="list-disc list-inside text-caption text-status-warning font-mono space-y-1">
              {report.hallucination_warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
