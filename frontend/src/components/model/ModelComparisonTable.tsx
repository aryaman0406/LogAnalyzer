import { Badge } from '@/components/ui/Badge'
import { pct } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ModelMetric } from '@/types'

interface ModelComparisonTableProps {
  models: ModelMetric[]
}

export function ModelComparisonTable({ models }: ModelComparisonTableProps) {
  return (
    <div className="border border-border rounded-md overflow-hidden bg-surface/30">
      <table className="w-full text-left text-xs">
        <thead className="bg-surface border-b border-border/80 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
          <tr>
            <th className="px-4 py-2.5">Model Architecture</th>
            <th className="px-4 py-2.5">Precision</th>
            <th className="px-4 py-2.5">Recall</th>
            <th className="px-4 py-2.5">F1 Score</th>
            <th className="px-4 py-2.5">Operating Threshold</th>
            <th className="px-4 py-2.5 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {models.map((m, idx) => {
            const isBest = idx === 0

            return (
              <tr
                key={m.model}
                className={`transition-colors hover:bg-surface/70 ${
                  isBest ? 'bg-accent/5 font-medium' : ''
                }`}
              >
                <td className="px-4 py-3 font-mono text-text-primary text-[11px]">
                  {m.model}
                </td>
                <td className="px-4 py-3 text-text-secondary">{pct(m.precision)}</td>
                <td className="px-4 py-3 text-text-secondary">{pct(m.recall)}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${isBest ? 'text-accent' : 'text-text-primary'}`}>
                    {pct(m.f1)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-text-muted">{m.threshold ?? 0.5}</td>
                <td className="px-4 py-3 text-right">
                  {isBest ? (
                    <Badge variant="accent" className="gap-1">
                      <Check className="h-3 w-3" /> Active Production
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Candidate</Badge>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
