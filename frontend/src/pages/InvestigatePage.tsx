import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IncidentPicker } from '@/components/investigate/IncidentPicker'
import { InvestigationControls } from '@/components/investigate/InvestigationControls'
import { RunButton } from '@/components/investigate/RunButton'
import { AgentTimeline } from '@/components/investigate/AgentTimeline'
import { ReportPanel } from '@/components/investigate/ReportPanel'
import { ImageDiagnosisPanel } from '@/components/investigate/ImageDiagnosisPanel'
import { useInvestigation } from '@/lib/hooks/useInvestigation'
import { analyzeImage, fetchModels } from '@/lib/api'
import type { ImageDiagnosis } from '@/types'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FlaskConical,
} from 'lucide-react'

export function InvestigatePage() {
  const [inputMode, setInputMode] = useState<'custom' | 'demo'>('custom')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageDiagnosis, setImageDiagnosis] = useState<ImageDiagnosis | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageRunning, setImageRunning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageAbortRef = useRef<AbortController | null>(null)
  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    refetchInterval: 30000,
  })
  const geminiConfigured = models?.providers.some((model) => model.id === 'gemini' && model.available) ?? false

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

    const mimeByExtension: Record<string, string> = {
      gif: 'image/gif',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    const imageMimeType = supportedImageTypes.includes(file.type)
      ? file.type
      : mimeByExtension[extension]
    if (file.type.startsWith('image/') || imageMimeType) {
      if (!imageMimeType || !supportedImageTypes.includes(imageMimeType)) {
        setImageFile(null)
        setImageDiagnosis(null)
        setLogFileName('')
        setLogContent('')
        setLogLineCount(0)
        setLogSizeBytes(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setImageError('Use a PNG, JPEG, GIF, or WebP image.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setImageFile(null)
        setImageDiagnosis(null)
        setLogFileName('')
        setLogContent('')
        setLogLineCount(0)
        setLogSizeBytes(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setImageError('Images must be 10 MB or smaller.')
        return
      }
      setInputMode('custom')
      setImageFile(file)
      setImageDiagnosis(null)
      setImageError(null)
      setLogContent('')
      setLogLineCount(0)
      setLogFileName(file.name)
      setLogSizeBytes(file.size)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null)
      setImageDiagnosis(null)
      setLogFileName('')
      setLogContent('')
      setLogLineCount(0)
      setLogSizeBytes(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setImageError('Log files must be 5 MB or smaller.')
      return
    }

    setInputMode('custom')
    setImageFile(null)
    setImageDiagnosis(null)
    setImageError(null)
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
    const sizeBytes = new Blob([text]).size
    if (sizeBytes > 5 * 1024 * 1024) {
      setImageError('Pasted logs must be 5 MB or smaller.')
      return
    }
    setImageFile(null)
    setImageDiagnosis(null)
    setImageError(null)
    if (text && (!logContent || imageFile)) {
      setLogFileName('pasted_log.txt')
    } else if (!text) {
      setLogFileName('')
    }
    setLogContent(text)
    setLogLineCount(text.split('\n').filter(Boolean).length)
    setLogSizeBytes(sizeBytes)
  }

  const handleClearCustomLog = () => {
    imageAbortRef.current?.abort()
    setImageFile(null)
    setImageDiagnosis(null)
    setImageError(null)
    setLogFileName('')
    setLogContent('')
    setLogLineCount(0)
    setLogSizeBytes(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleStart = async () => {
    if (inputMode === 'custom' && imageFile) {
      const controller = new AbortController()
      imageAbortRef.current?.abort()
      imageAbortRef.current = controller
      setImageDiagnosis(null)
      setImageError(null)
      setImageRunning(true)
      try {
        const result = await analyzeImage(imageFile, controller.signal)
        if (!controller.signal.aborted) setImageDiagnosis(result)
      } catch (err) {
        if (!controller.signal.aborted) {
          setImageError(err instanceof Error ? err.message : 'Image analysis failed.')
        }
      } finally {
        if (imageAbortRef.current === controller) {
          imageAbortRef.current = null
          setImageRunning(false)
        }
      }
      return
    }

    run({
      incident_id: inputMode === 'demo' ? (incidentId || 'INC-01') : null,
      log_file: logFile || undefined,
      log_content: inputMode === 'custom' ? (logContent || undefined) : undefined,
      use_anomaly_detector: useAnomalyDetector,
      use_tools: useTools,
      provider: provider,
    })
  }

  const handleCancel = () => {
    cancel()
    imageAbortRef.current?.abort()
    imageAbortRef.current = null
    setImageRunning(false)
  }

  const isProcessing = running || imageRunning

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const canRun =
    inputMode === 'demo'
      ? Boolean(incidentId)
      : Boolean(logContent.trim() || logFile.trim() || imageFile) && !(Boolean(imageError) && Boolean(imageFile))

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2.5">
            <span>Analyze Logs & Errors</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" />
              AI Agent
            </span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Upload a log file, paste raw errors, or drop an error screenshot to see <strong className="text-text-primary">which line failed</strong>, <strong className="text-text-primary">why it happened</strong>, and <strong className="text-text-primary">how to fix it</strong>.
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clean Mode-Based Input Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="surface-card p-5 space-y-4 border-t-2 border-t-accent">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-surface border border-border">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setInputMode('custom')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  inputMode === 'custom'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Your Log / Image</span>
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setInputMode('demo')
                  if (imageFile) handleClearCustomLog()
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                  inputMode === 'demo'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Demo Scenarios</span>
              </button>
            </div>

            {inputMode === 'custom' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary">
                    Upload log file or screenshot
                  </label>
                  {logFileName && (
                    <button
                      type="button"
                      onClick={handleClearCustomLog}
                      className="text-xs font-medium text-status-error hover:underline flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>

                {/* Upload Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group border-2 border-dashed border-border hover:border-accent rounded-lg p-4 text-center cursor-pointer bg-surface/50 hover:bg-accent/5 transition-all space-y-1.5"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.log,.jsonl,image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="mx-auto w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div className="text-sm text-text-primary font-medium truncate px-2">
                    {logFileName ? logFileName : 'Click to choose a log or screenshot'}
                  </div>
                  <div className="text-xs text-text-muted">
                    Supports .log, .txt, .jsonl (5 MB) · PNG, JPG, WebP (10 MB)
                  </div>
                </div>

                {/* Paste Textarea */}
                {!imageFile && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary block">
                      Or paste your log lines directly
                    </label>
                    <textarea
                      value={logContent}
                      onChange={handlePasteChange}
                      disabled={isProcessing}
                      placeholder="Paste Python, Java, Nginx, SSH, or JSONL logs here..."
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent leading-relaxed"
                    />
                  </div>
                )}

                {/* File details chip */}
                {logFileName && (
                  <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 truncate">
                      {imageFile
                        ? <ImageIcon className="h-3.5 w-3.5 text-accent shrink-0" />
                        : <FileText className="h-3.5 w-3.5 text-accent shrink-0" />}
                      <span className="truncate text-text-primary font-medium">{logFileName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary shrink-0">
                      {!imageFile && <><span>{logLineCount} lines</span><span>•</span></>}
                      <span>{formatBytes(logSizeBytes)}</span>
                    </div>
                  </div>
                )}

                {imageFile && (
                  <p className="text-xs text-text-muted">
                    Screenshot will be inspected by Google Gemini Vision.
                  </p>
                )}
                {imageError && !imageFile && (
                  <p role="alert" className="text-xs font-medium text-status-error bg-status-error-bg border border-status-error-border rounded px-3 py-2">
                    {imageError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  Test the agent on a built-in simulated failure from the sample e-commerce app:
                </p>
                <IncidentPicker
                  selected={incidentId}
                  onSelect={(id) => {
                    setIncidentId(id)
                    if (logContent || imageFile || imageError || logFileName) handleClearCustomLog()
                  }}
                  disabled={isProcessing}
                />
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-1">
              <RunButton
                onRun={handleStart}
                onCancel={handleCancel}
                running={isProcessing}
                disabled={!isProcessing && !canRun}
                actionLabel={imageFile && inputMode === 'custom' ? 'Analyze Screenshot' : 'Analyze Logs'}
                stopLabel={imageFile && inputMode === 'custom' ? 'Stop Image Analysis' : 'Stop Analysis'}
              />
            </div>

            {/* Collapsible Advanced Settings */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-medium text-text-secondary hover:text-text-primary py-1"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
                  <span>Advanced Settings</span>
                </span>
                <span className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
                  <span>{provider === 'gemini' ? 'Gemini' : 'Offline'} · {useTools ? 'Tools On' : 'Tools Off'}</span>
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              {showAdvanced && (
                <div className="mt-2">
                  <InvestigationControls
                    useAnomalyDetector={useAnomalyDetector}
                    setUseAnomalyDetector={setUseAnomalyDetector}
                    useTools={useTools}
                    setUseTools={setUseTools}
                    logFile={logFile}
                    setLogFile={setLogFile}
                    provider={provider}
                    setProvider={setProvider}
                    geminiConfigured={geminiConfigured}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Progress Timeline or Structured Report (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {imageFile && inputMode === 'custom' ? (
            <ImageDiagnosisPanel
              fileName={imageFile.name}
              result={imageDiagnosis}
              loading={imageRunning}
              error={imageError}
            />
          ) : report || error ? (
            <ReportPanel
              report={report}
              error={error}
              investigationId={investigationId}
              uploadedLogContent={inputMode === 'custom' ? logContent : ''}
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
