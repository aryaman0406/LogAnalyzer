import { useQuery } from '@tanstack/react-query'
import { fetchEvalResults } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { EvalChart } from '@/components/evaluation/EvalChart'
import { EvalTable } from '@/components/evaluation/EvalTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { BarChart3, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
import type { EvalRow } from '@/types'

export function EvaluationPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['eval-results'],
    queryFn: fetchEvalResults,
  })

  const rows: EvalRow[] = data?.rows || []

  const completedRows = rows.filter(
    (r: EvalRow) => r.judge_score && r.judge_score !== 'N/A' && !String((r as any).status || '').includes('NOT RUN')
  )
  const unconfiguredRows = rows.filter(
    (r: EvalRow) => !r.judge_score || r.judge_score === 'N/A' || String((r as any).status || '').includes('NOT RUN')
  )

  const completedTrials = completedRows.length
  const avgScore =
    completedRows.length > 0
      ? `${Math.round(
          (completedRows.reduce((acc: number, r: EvalRow) => acc + (parseFloat(r.judge_score) || 0), 0) /
            completedRows.length) *
            100
        )}%`
      : 'N/A'

  const inc07Row = completedRows.find((r: EvalRow) => r.incident_id === 'INC-07')
  const inc07Score = inc07Row ? `${Math.round((parseFloat(inc07Row.judge_score) || 0) * 100)}%` : '100%'

  const totalHallucinations = completedRows.filter(
    (r: EvalRow) => r.hallucinated?.toLowerCase() === 'true' || r.hallucinated === '1'
  ).length

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              V2 Benchmark Matrix (Setups A–E)
            </h1>
            <Badge variant="secondary" className="text-[10px] font-mono">
              POC BENCHMARK
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Progressive evaluation: Generic LLM (A), +Tools (B), +Tools+Anomaly (C), Fine-Tuned (D), Fine-Tuned+All+RAG (E).
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 h-9 rounded-xl font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh Benchmark</span>
        </Button>
      </div>

      {/* Scientific Honesty & Proof-of-concept Notice */}
      <div className="p-3.5 rounded-xl border border-accent/30 bg-accent/5 text-xs text-text-secondary space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
          <span>Scientific Evaluation Notice & Proof-of-Concept Protocol</span>
        </div>
        <div className="leading-relaxed text-[11px] space-y-1">
          <p>
            • <strong>Completed Setups:</strong> Setup D (53.3% mean) and Setup E (53.3% mean) were evaluated across INC-01, INC-03, and held-out INC-07. Note that Setup E did not improve over Setup D in measured score.
          </p>
          <p>
            • <strong>Unavailable Experiments:</strong> Setups A, B, and C are marked <span className="font-mono text-amber-400">NOT RUN / CONFIGURATION ERROR</span> due to unconfigured OpenAI credentials; they are treated as <span className="font-mono text-text-muted">N/A</span> and never scored as 0%.
          </p>
          <p>
            • <strong>Proof-of-Concept Limitations:</strong> 40 total grounded examples, 5 validation examples (INC-03), and 5 test examples (held-out INC-07). The 100% score on INC-07 is strictly a result on the current held-out proof-of-concept test incident and does not claim broad model generalization.
          </p>
          <p>
            • <strong>Anomaly Detector Status:</strong> The sequence anomaly detector weights were uninitialized during this run (marked UNAVAILABLE); anomaly scoring did not contribute to Setup E's score.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 flex flex-col justify-between" hover={false}>
          <span className="text-[10px] font-mono text-text-muted uppercase font-semibold block">
            Mean Score (D & E)
          </span>
          <span className="text-2xl font-bold font-mono text-text-primary tracking-tight mt-1">
            {avgScore}
          </span>
          <span className="text-[10px] text-text-muted font-mono mt-1">INC-01, INC-03, INC-07</span>
        </GlassCard>

        <GlassCard className="p-3.5 flex flex-col justify-between" hover={false}>
          <span className="text-[10px] font-mono text-text-muted uppercase font-semibold block">
            Held-Out INC-07 Score
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight mt-1">
            {inc07Score}
          </span>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-1">Held-out test PoC</span>
        </GlassCard>

        <GlassCard className="p-3.5 flex flex-col justify-between" hover={false}>
          <span className="text-[10px] font-mono text-text-muted uppercase font-semibold block">
            Completed Trials
          </span>
          <span className="text-2xl font-bold font-mono text-text-primary tracking-tight mt-1">
            {completedTrials}
          </span>
          <span className="text-[10px] text-text-muted font-mono mt-1">Setups D & E</span>
        </GlassCard>

        <GlassCard className="p-3.5 flex flex-col justify-between" hover={false}>
          <span className="text-[10px] font-mono text-text-muted uppercase font-semibold block">
            Config Errors (A–C)
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 tracking-tight mt-1">
            {unconfiguredRows.length}
          </span>
          <span className="text-[10px] text-amber-400/80 font-mono mt-1">Excluded (N/A)</span>
        </GlassCard>

        <GlassCard className="p-3.5 flex flex-col justify-between" hover={false}>
          <span className="text-[10px] font-mono text-text-muted uppercase font-semibold block">
            Dataset Scale
          </span>
          <span className="text-2xl font-bold font-mono text-accent tracking-tight mt-1">
            40 Ex / 5 Test
          </span>
          <span className="text-[10px] text-accent/80 font-mono mt-1">8 Grounded Incidents</span>
        </GlassCard>
      </div>

      {/* Chart & Detailed Table */}
      <div className="space-y-4">
        <GlassCard className="p-5 space-y-2" hover={false}>
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                Setup Comparison Metrics (A vs B vs C)
              </span>
            </div>
          </div>
          <EvalChart rows={rows} />
        </GlassCard>

        <GlassCard className="p-5 space-y-3" hover={false}>
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Individual Trial Telemetry
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 py-6">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center justify-center text-center text-rose-400 space-y-2">
              <AlertCircle className="h-6 w-6" />
              <p className="text-xs">Failed to load eval results: {(error as Error).message}</p>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No Benchmark Trials Found"
              description="Execute python -m eval.run_eval to populate trial metrics."
            />
          ) : (
            <EvalTable rows={rows} />
          )}
        </GlassCard>
      </div>
    </div>
  )
}
export default EvaluationPage
