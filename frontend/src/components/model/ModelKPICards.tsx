import { GlassCard } from '@/components/ui/GlassCard'
import { pct } from '@/lib/utils'
import { Cpu, Target, CheckCircle2, Sliders } from 'lucide-react'
import type { ModelMetric } from '@/types'

interface ModelKPICardsProps {
  primaryModel: ModelMetric | null
}

export function ModelKPICards({ primaryModel }: ModelKPICardsProps) {
  if (!primaryModel) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassCard className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
          <Cpu className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-semibold block">
            Active Anomaly Model
          </span>
          <span className="text-sm font-bold text-text-primary uppercase truncate">
            {primaryModel.model}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-semibold block">
            F1 Score
          </span>
          <span className="text-xl font-bold text-text-primary">
            {pct(primaryModel.f1)}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-semibold block">
            Precision / Recall
          </span>
          <span className="text-sm font-bold text-text-primary">
            {pct(primaryModel.precision)} / {pct(primaryModel.recall)}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] text-text-muted uppercase font-semibold block">
            Decision Threshold
          </span>
          <span className="text-xl font-bold font-mono text-text-primary">
            {primaryModel.threshold ?? 0.5}
          </span>
        </div>
      </GlassCard>
    </div>
  )
}
