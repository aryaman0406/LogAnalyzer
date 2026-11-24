import { useQuery } from '@tanstack/react-query'
import { fetchModelStatus } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Activity, Bot, Database, ShieldCheck } from 'lucide-react'

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
            AI, ML & Retrieval Status
          </h1>
          <p className="text-base text-text-secondary mt-1">
            Runtime status for the configured Gemini provider, local anomaly model, documentation retrieval, and external ML service.
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
          {/* Gemini Provider Card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Gemini Reasoning</h2>
              </div>
              <Badge variant={status?.active_provider === 'gemini' ? 'success' : 'warn'}>
                {status?.active_provider === 'gemini' ? 'READY' : 'OFFLINE'}
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Active provider</span>
                <span className="font-mono font-medium text-text-primary">{status?.active_provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Active model</span>
                <span className="font-mono font-medium text-text-primary">{status?.active_model}</span>
              </div>
            </div>

            {/* External ML Service Card */}
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-accent" />
                  <h2 className="text-base font-semibold text-text-primary">External ML Service</h2>
                </div>
                <Badge variant={status?.external_ml_service?.available ? 'success' : 'warn'}>
                  {status?.external_ml_service?.status || 'UNAVAILABLE'}
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Configured</span>
                  <span className="font-mono font-medium text-text-primary">
                    {status?.external_ml_service?.configured ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Availability</span>
                  <span className="font-mono font-medium text-text-primary">
                    {status?.external_ml_service?.available ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Anomaly Detector Card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Random Forest Anomaly Detector</h2>
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
                <span className="font-mono font-medium text-text-primary">HDFS block-session model</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Supported data</span>
                <span className="font-mono text-caption text-text-muted">HDFS block logs</span>
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
              <Badge variant={status?.rag?.available ? 'success' : 'warn'}>
                {status?.rag?.status || 'UNAVAILABLE'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Knowledge Base</span>
                <span className="font-mono font-medium text-text-primary">
                  {status?.rag?.available ? 'README & incident catalog' : 'Unavailable'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Similarity Metric</span>
                <span className="font-mono font-medium text-text-primary">TF-IDF cosine similarity</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Top-K Retrieval</span>
                <span className="font-mono text-caption text-text-muted">2 chunks per investigation</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default ModelPage
