import { useQuery } from '@tanstack/react-query'
import { fetchModelStatus } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Cpu, Activity, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

export function ModelPage() {
  const { data: status, isLoading, isError } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: fetchModelStatus,
    refetchInterval: 10000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            ML Service & Anomaly Detector Status
          </h1>
          <p className="text-base text-text-secondary mt-1">
            Real-time telemetry and health monitoring for Drain3 clustering, LSTM anomaly models, and inference providers.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="surface-card p-6 text-sm text-text-muted">Loading telemetry status...</div>
      ) : isError ? (
        <div className="surface-card p-6 border-status-error-border bg-status-error-bg text-status-error text-sm">
          Failed to fetch model service status.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Anomaly Detector Card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Drain3 & LSTM Detector</h2>
              </div>
              <Badge variant={status?.anomaly_detector?.available ? 'success' : 'warn'}>
                {status?.anomaly_detector?.status || 'UNAVAILABLE'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Service Availability</span>
                <span className="font-mono font-medium text-text-primary">
                  {status?.anomaly_detector?.available ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Model Architecture</span>
                <span className="font-mono font-medium text-text-primary">Drain3 Template + LSTM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Execution Latency</span>
                <span className="font-mono text-caption text-text-muted">~250ms avg</span>
              </div>
            </div>
          </div>

          {/* RAG Vector Index Card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-status-success" />
                <h2 className="text-base font-semibold text-text-primary">Technical Documentation RAG</h2>
              </div>
              <Badge variant="success">READY</Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Knowledge Base</span>
                <span className="font-mono font-medium text-text-primary">Internal Runbooks & Architecture</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Similarity Metric</span>
                <span className="font-mono font-medium text-text-primary">Cosine Distance</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Top-K Retrieval</span>
                <span className="font-mono text-caption text-text-muted">3 chunks per query</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ModelPage
