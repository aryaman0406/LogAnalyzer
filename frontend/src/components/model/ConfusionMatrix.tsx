import { GlassCard } from '@/components/ui/GlassCard'

interface ConfusionMatrixProps {
  matrix?: number[][]
}

export function ConfusionMatrix({ matrix }: ConfusionMatrixProps) {
  // Default 2x2 mock matrix if not provided: [[TN, FP], [FN, TP]]
  const cm = matrix || [
    [1420, 35],
    [18, 527],
  ]

  const total = cm.flat().reduce((a, b) => a + b, 0)
  const tn = cm[0]?.[0] || 0
  const fp = cm[0]?.[1] || 0
  const fn = cm[1]?.[0] || 0
  const tp = cm[1]?.[1] || 0

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-border/80">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Confusion Matrix Heatmap
        </span>
        <span className="text-[10px] text-text-muted">N = {total.toLocaleString()} evaluations</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {/* True Negatives */}
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase font-semibold text-emerald-400 block">
            True Negatives (TN)
          </span>
          <span className="text-xl font-bold font-mono text-emerald-300">
            {tn.toLocaleString()}
          </span>
          <span className="text-[10px] text-text-muted block">Correctly marked normal</span>
        </div>

        {/* False Positives */}
        <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase font-semibold text-amber-400 block">
            False Positives (FP)
          </span>
          <span className="text-xl font-bold font-mono text-amber-300">
            {fp.toLocaleString()}
          </span>
          <span className="text-[10px] text-text-muted block">False alarms</span>
        </div>

        {/* False Negatives */}
        <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-center space-y-1">
          <span className="text-[10px] uppercase font-semibold text-rose-400 block">
            False Negatives (FN)
          </span>
          <span className="text-xl font-bold font-mono text-rose-300">
            {fn.toLocaleString()}
          </span>
          <span className="text-[10px] text-text-muted block">Missed anomalies</span>
        </div>

        {/* True Positives */}
        <div className="p-3 rounded-md bg-accent/15 border border-accent/40 text-center space-y-1">
          <span className="text-[10px] uppercase font-semibold text-accent block">
            True Positives (TP)
          </span>
          <span className="text-xl font-bold font-mono text-accent">
            {tp.toLocaleString()}
          </span>
          <span className="text-[10px] text-text-muted block">Correctly caught anomalies</span>
        </div>
      </div>
    </GlassCard>
  )
}
