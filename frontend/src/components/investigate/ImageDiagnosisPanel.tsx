import { AlertCircle, AlertTriangle, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react'
import type { ImageDiagnosis } from '@/types'

interface ImageDiagnosisPanelProps {
  fileName: string
  result: ImageDiagnosis | null
  loading: boolean
  error: string | null
}

export function ImageDiagnosisPanel({ fileName, result, loading, error }: ImageDiagnosisPanelProps) {
  return (
    <div className="surface-card p-5 md:p-6 space-y-5">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <ImageIcon className="h-5 w-5 text-accent" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">Image Error Analysis</h2>
          <p className="text-xs text-text-muted truncate">{fileName}</p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-48 flex flex-col items-center justify-center gap-3 text-text-secondary">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="text-sm">Reading the screenshot and checking for errors…</p>
        </div>
      ) : error ? (
        <div className="rounded border border-status-error-border bg-status-error-bg p-4 flex gap-3 text-status-error">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">Image analysis failed</h3>
            <p className="mt-1 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-5">
          <div className="rounded border border-border bg-background-overlay/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {result.error_detected ? (
                <AlertTriangle className="h-4 w-4 text-status-warning" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-status-success" />
              )}
              {result.error_detected ? 'Potential error found' : 'No clear error found'}
              {typeof result.confidence === 'number' && (
                <span className="ml-auto text-xs font-mono text-text-muted">
                  {Math.round(result.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{result.summary}</p>
          </div>

          {result.detected_errors.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                Detected Errors
              </h3>
              <ul className="space-y-2">
                {result.detected_errors.map((item, index) => (
                  <li key={`${index}-${item}`} className="rounded border border-border bg-surface p-3 text-sm font-mono text-text-primary break-words">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Likely Cause
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary">{result.likely_cause}</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Suggested Next Steps
            </h3>
            <p className="rounded border border-border bg-background p-4 text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
              {result.suggested_fix}
            </p>
          </section>

          {result.extracted_text && (
            <details className="rounded border border-border bg-surface p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                Extracted Text
              </summary>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs font-mono text-text-secondary">
                {result.extracted_text}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div className="min-h-48 flex flex-col items-center justify-center gap-2 text-center">
          <ImageIcon className="h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-secondary">Choose “Analyze Image” to inspect this screenshot.</p>
          <p className="text-xs text-text-muted">The image is sent to Google Gemini for analysis.</p>
        </div>
      )}
    </div>
  )
}
