import { useQuery } from '@tanstack/react-query'
import { fetchModelMetrics } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { ModelKPICards } from '@/components/model/ModelKPICards'
import { ConfusionMatrix } from '@/components/model/ConfusionMatrix'
import { ModelComparisonTable } from '@/components/model/ModelComparisonTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Cpu, RefreshCw, AlertCircle } from 'lucide-react'

export function ModelPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['model-metrics'],
    queryFn: fetchModelMetrics,
  })

  const models = data?.models || []
  const primaryModel = models[0] || null

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            ML Anomaly Detector Diagnostics
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Random Forest & Drain3 holdout evaluation, confusion matrix heatmaps, and threshold tuning.
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
          <span>Refresh Model Metrics</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-6">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <GlassCard className="p-8 flex flex-col items-center justify-center text-center text-rose-400 space-y-2" hover={false}>
          <AlertCircle className="h-6 w-6" />
          <p className="text-xs">Failed to load model metrics: {(error as Error).message}</p>
        </GlassCard>
      ) : models.length === 0 ? (
        <GlassCard className="p-8" hover={false}>
          <EmptyState
            icon={Cpu}
            title="No Trained Model Metrics Available"
            description="Train a session-level detector with python -m ml.train to inspect holdout metrics."
          />
        </GlassCard>
      ) : (
        <>
          {/* KPI metrics row */}
          <ModelKPICards primaryModel={primaryModel} />

          {/* Matrix & Model comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <ConfusionMatrix matrix={primaryModel?.confusion_matrix} />
            </div>

            <div className="lg:col-span-7">
              <GlassCard className="p-5 space-y-3" hover={false}>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                    Model Architecture Holdout Benchmarks
                  </span>
                </div>
                <ModelComparisonTable models={models} />
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
export default ModelPage
