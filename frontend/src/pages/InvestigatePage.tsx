import { useState, useRef } from 'react'
import { IncidentPicker } from '@/components/investigate/IncidentPicker'
import { InvestigationControls } from '@/components/investigate/InvestigationControls'
import { RunButton } from '@/components/investigate/RunButton'
import { AgentTimeline } from '@/components/investigate/AgentTimeline'
import { ReportPanel } from '@/components/investigate/ReportPanel'
import { useInvestigation } from '@/lib/hooks/useInvestigation'
import { UploadCloud, FileText, X } from 'lucide-react'

export function InvestigatePage() {
  const [incidentId, setIncidentId] = useState<string>('INC-01')
  const [provider, setProvider] = useState<string>('gemini')
  const [useAnomalyDetector, setUseAnomalyDetector] = useState<boolean>(true)
  const [useTools, setUseTools] = useState<boolean>(true)
  const [logFile, setLogFile] = useState<string>('')
  
  // Custom Log File Upload / Paste state
  const [logFileName, setLogFileName] = useState<string>('')
  const [logContent, setLogContent] = useState<string>('')
  const [logLineCount, setLogLineCount] = useState<number>(0)
  const [logSizeBytes, setLogSizeBytes] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogFileName(file.name)
    setLogSizeBytes(file.size)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = (event.target?.result as string) || ''
      setLogContent(text)
      setLogLineCount(text.split('\n').filter(Boolean).length)
    }
    reader.readAsText(file)
  }

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setLogContent(text)
    setLogLineCount(text.split('\n').filter(Boolean).length)
    setLogSizeBytes(new Blob([text]).size)
    if (!logFileName) {
      setLogFileName('pasted_log.txt')
    }
  }

  const handleClearCustomLog = () => {
    setLogFileName('')
    setLogContent('')
    setLogLineCount(0)
    setLogSizeBytes(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleStart = () => {
    run({
      incident_id: logContent ? null : (incidentId || null),
      log_file: logFile || undefined,
      use_anomaly_detector: useAnomalyDetector,
      use_tools: useTools,
      provider: provider,
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Investigate Incident
          </h1>
          <p className="text-base text-text-secondary mt-1">
            Run an autonomous, grounded root-cause diagnosis over system logs, AST code structures, and ML ranking.
          </p>
        </div>
      </div>

      {/* Main 2-Column or 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Log Selection, Upload, and Engine Config (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted font-mono">
              Investigation Target
            </h2>

            {/* Incident Scenario Picker */}
            <IncidentPicker
              selected={incidentId}
              onSelect={(id) => {
                setIncidentId(id)
                if (logContent) handleClearCustomLog()
              }}
              disabled={running}
            />

            {/* Custom Log Upload / Paste Area */}
            <div className="pt-3 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-caption font-mono uppercase text-text-muted font-semibold">
                  Or Upload / Paste Custom Log
                </label>
                {logFileName && (
                  <button
                    onClick={handleClearCustomLog}
                    className="text-caption font-mono text-status-error hover:underline flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {/* Upload Drop Zone / Input */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-border hover:border-border-hover rounded p-3 text-center cursor-pointer bg-surface/40 hover:bg-surface transition-colors space-y-1"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.log,.jsonl"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={running}
                />
                <UploadCloud className="h-5 w-5 mx-auto text-text-muted" />
                <div className="text-sm text-text-primary font-medium">
                  {logFileName ? logFileName : 'Click to upload log file'}
                </div>
                <div className="text-caption text-text-muted">
                  Supports .txt, .log, .jsonl
                </div>
              </div>

              {/* Paste Textarea */}
              <div className="space-y-1">
                <textarea
                  value={logContent}
                  onChange={handlePasteChange}
                  disabled={running}
                  placeholder="Or paste raw incident log lines here..."
                  rows={3}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* File details chip if present */}
              {logFileName && (
                <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between text-caption font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="truncate text-text-primary font-medium">{logFileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted shrink-0">
                    <span>{logLineCount} lines</span>
                    <span>•</span>
                    <span>{formatBytes(logSizeBytes)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Investigation Controls */}
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

            {/* Clear Primary Action Button */}
            <div className="pt-2">
              <RunButton
                onRun={handleStart}
                onCancel={cancel}
                running={running}
                disabled={!incidentId && !logFile && !logContent}
              />
            </div>
          </div>
        </div>

        {/* Center / Right Column: Progress Timeline or Report (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {report ? (
            <ReportPanel
              report={report}
              error={error}
              investigationId={investigationId}
            />
          ) : (
            <AgentTimeline
              events={events}
              running={running}
              elapsed={elapsed}
              investigationId={investigationId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
export default InvestigatePage
