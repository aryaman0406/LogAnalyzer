import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import type { EvalRow } from '@/types'

interface FailureDrilldownProps {
  row: EvalRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FailureDrilldown({
  row,
  open,
  onOpenChange,
}: FailureDrilldownProps) {
  if (!row) return null

  const isHallucinated =
    row.hallucinated?.toLowerCase() === 'true' || row.hallucinated === '1'
  const score = parseFloat(row.judge_score) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isHallucinated ? (
              <ShieldAlert className="h-5 w-5 text-error" />
            ) : score >= 0.8 ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
            <DialogTitle>Trial Details: {row.incident_id}</DialogTitle>
          </div>
          <DialogDescription>
            Detailed evaluation benchmark telemetry for Setup {row.setup}, Trial #{row.trial}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-surface border border-border">
              <span className="text-[10px] text-text-muted block uppercase">Setup Config</span>
              <span className="font-semibold text-text-primary text-sm">
                Setup {row.setup}
              </span>
            </div>
            <div className="p-2.5 rounded bg-surface border border-border">
              <span className="text-[10px] text-text-muted block uppercase">Judge Accuracy</span>
              <span className="font-semibold text-accent text-sm">
                {Math.round(score * 100)}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-surface border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Execution Steps:</span>
              <span className="font-mono text-text-primary">{row.steps}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Hallucination Flag:</span>
              <Badge variant={isHallucinated ? 'error' : 'success'}>
                {isHallucinated ? 'Detected' : 'Clean'}
              </Badge>
            </div>
            {row.cost && (
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">LLM Ingestion Cost:</span>
                <span className="font-mono text-text-primary">${row.cost}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
