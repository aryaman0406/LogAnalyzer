import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IncidentPicker } from '@/components/investigate/IncidentPicker'
import { InvestigationControls } from '@/components/investigate/InvestigationControls'
import { RunButton } from '@/components/investigate/RunButton'
import { AgentTimeline } from '@/components/investigate/AgentTimeline'
import { ReportPanel } from '@/components/investigate/ReportPanel'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/Badge'
import { useInvestigation } from '@/lib/hooks/useInvestigation'
import { fetchModelStatus } from '@/lib/api'
import { Sparkles, ShieldCheck, Activity, Cpu, Database, BookOpen, Bot } from 'lucide-react'

export function InvestigatePage() {
  const [incidentId, setIncidentId] = useState<string>('INC-01')
  const [provider, setProvider] = useState<string>('local')
  const [useAnomalyDetector, setUseAnomalyDetector] = useState<boolean>(true)
  const [useTools, setUseTools] = useState<boolean>(true)
  const [logFile, setLogFile] = useState<string>('')

  const { data: statusData } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: fetchModelStatus,
    refetchInterval: 10000,
  })

  const {
    running,
    events,
    report,
    investigationId,
    elapsed,
    error,
    run,
    cancel,
  } = useInvestigation()

  const handleStart = () => {
    run({
      incident_id: incidentId || null,
      log_file: logFile || undefined,
      use_anomaly_detector: useAnomalyDetector,
      use_tools: useTools,
      provider: provider,
    })
  }

  const investigationStatus = running
    ? 'INVESTIGATING...'
    : report
    ? 'COMPLETE'
    : error
    ? 'FAILED'
    : 'IDLE'

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Incident Investigation Console
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-[10px] font-mono font-semibold">
              <span className={`pulse-dot ${running ? 'bg-amber-400' : 'bg-accent'}`} />
              <span>{running ? 'AUTONOMOUS RUNNING' : 'AGENT READY'}</span>
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time autonomous log traversal, Drain3 anomaly scoring, technical RAG, and verified root-cause diagnosis.
          </p>
        </div>

        {/* Dashboard Status Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-surface/40">
            <Bot className="h-3 w-3 text-accent" />
            <span className="text-text-muted">Model:</span>
            <span className="text-text-primary font-medium">
              {provider === 'local' ? 'Local Incident LLM' : provider.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-surface/40">
            <Activity className="h-3 w-3 text-rose-400" />
            <span className="text-text-muted">Detector:</span>
            <span className={statusData?.anomaly_detector?.available ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {statusData?.anomaly_detector?.status || 'UNAVAILABLE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-surface/40">
            <BookOpen className="h-3 w-3 text-purple-400" />
            <span className="text-text-muted">RAG:</span>
            <span className="text-emerald-400 font-semibold">
              {statusData?.rag?.status || 'READY'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-surface/40">
            <span className="text-text-muted">Status:</span>
            <Badge
              variant={
                running
                  ? 'warn'
                  : report
                  ? 'success'
                  : error
                  ? 'error'
                  : 'secondary'
              }
              className="text-[9px] uppercase px-1.5 py-0 font-mono"
            >
              {investigationStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Config Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <GlassCard className="p-4 space-y-3" hover={false}>
            <IncidentPicker
              selected={incidentId}
              onSelect={setIncidentId}
              disabled={running}
            />

            <InvestigationControls
              useAnomalyDetector={useAnomalyDetector}
              setUseAnomalyDetector={setUseAnomalyDetector}
              useTools={useTools}
              setUseTools={setUseTools}
              logFile={logFile}
              setLogFile={setLogFile}
              provider={provider}
              setProvider={setProvider}
              disabled={running}
            />

            <div className="pt-2">
              <RunButton
                onRun={handleStart}
                onCancel={cancel}
                running={running}
                disabled={!incidentId && !logFile}
              />
            </div>
          </GlassCard>
        </div>

        {/* Center Column: Reasoning Stream (5 cols) */}
        <div className="lg:col-span-5">
          <AgentTimeline
            events={events}
            running={running}
            elapsed={elapsed}
            investigationId={investigationId}
          />
        </div>

        {/* Right Column: Diagnostic Report (4 cols) */}
        <div className="lg:col-span-4">
          <ReportPanel
            report={report}
            error={error}
            investigationId={investigationId}
          />
        </div>
      </div>
    </div>
  )
}
export default InvestigatePage
