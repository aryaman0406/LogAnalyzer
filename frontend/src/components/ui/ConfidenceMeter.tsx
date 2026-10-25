interface ConfidenceMeterProps {
  value?: number | null // 0–1 or null/undefined
  label?: string
  basis?: string | null
  className?: string
}

export function ConfidenceMeter({ value, label, basis, className = '' }: ConfidenceMeterProps) {
  if (value === null || value === undefined) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-caption font-mono uppercase tracking-wider text-text-muted">
            {label || 'Confidence'}
          </span>
          <span className="font-mono text-sm text-text-muted italic">
            Not estimated
          </span>
        </div>
        {basis && (
          <p className="text-caption font-mono text-text-muted">
            {basis}
          </p>
        )}
      </div>
    )
  }

  const isSelfAssessed = basis === "LLM self-assessed confidence" || basis === "self-assessed by the LLM" || label?.includes("self-assessed")
  const percentage = Math.round(value * 100)

  const getLabel = (v: number) => {
    if (v >= 0.8) return 'High'
    if (v >= 0.5) return 'Medium'
    return 'Low'
  }

  const getColor = (v: number) => {
    if (v >= 0.8) return { text: 'text-status-success', bar: 'bg-status-success' }
    if (v >= 0.5) return { text: 'text-status-warning', bar: 'bg-status-warning' }
    return { text: 'text-status-error', bar: 'bg-status-error' }
  }

  const { text, bar } = getColor(value)

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-caption font-mono uppercase tracking-wider text-text-muted">
          {label || 'Confidence'}
        </span>
        <span className={`font-mono font-bold text-sm ${text}`}>
          {isSelfAssessed ? `${getLabel(value)} (self-assessed by the LLM)` : `${percentage}%`}
        </span>
      </div>

      {basis && !isSelfAssessed && (
        <p className="text-caption font-mono text-text-muted">
          {basis}
        </p>
      )}

      {/* Progress Track */}
      <div className="h-2 w-full rounded-full bg-surface overflow-hidden border border-border">
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${bar} transition-all duration-300 ease-out`}
        />
      </div>
    </div>
  )
}
