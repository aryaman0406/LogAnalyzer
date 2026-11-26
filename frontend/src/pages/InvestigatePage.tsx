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
import { UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react'

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
    // Always clear image state when user types in paste area
    setImageFile(null)
    setImageDiagnosis(null)
    setImageError(null)
    // Replace image filename with pasted_log.txt; keep existing log filename if already set
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
    if (imageFile) {
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
      incident_id: logContent ? null : (incidentId || null),
      log_file: logFile || undefined,
      log_content: logContent || undefined,
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

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Investigate Incident
          </h1>
          <p className="text-base text-text-secondary mt-1">
            Analyze incident logs, search repository source and Git history, and review the resulting evidence.
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
                if (logContent || imageFile || imageError || logFileName) handleClearCustomLog()
              }}
              disabled={isProcessing}
            />

            {/* Custom Log Upload / Paste Area */}
            <div className="pt-3 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-caption font-mono uppercase text-text-muted font-semibold">
                  Upload or paste a log, or choose an error screenshot
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
                  accept=".txt,.log,.jsonl,image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                <UploadCloud className="h-5 w-5 mx-auto text-text-muted" />
                <div className="text-sm text-text-primary font-medium">
                  {logFileName ? logFileName : 'Choose a log file or error image'}
                </div>
                <div className="text-caption text-text-muted">
                  Supports .txt, .log, .jsonl, PNG, JPEG, GIF, WebP
                </div>
              </div>

              {/* Paste Textarea */}
              {!imageFile && <div className="space-y-1">
                <textarea
                  value={logContent}
                  onChange={handlePasteChange}
                  disabled={isProcessing}
                  placeholder="Or paste raw incident log lines here..."
                  rows={3}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>}

              {/* File details chip if present */}
              {logFileName && (
                <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between text-caption font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    {imageFile
                      ? <ImageIcon className="h-3.5 w-3.5 text-accent shrink-0" />
                      : <FileText className="h-3.5 w-3.5 text-accent shrink-0" />}
                    <span className="truncate text-text-primary font-medium">{logFileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted shrink-0">
                    {!imageFile && <><span>{logLineCount} lines</span><span>•</span></>}
                    <span>{formatBytes(logSizeBytes)}</span>
                  </div>
                </div>
              )}
              {imageFile && (
                <p className="text-caption text-text-muted">
                  Image analysis sends this file to Google Gemini.
                </p>
              )}
              {imageError && !imageFile && (
                <p role="alert" className="text-sm text-status-error">{imageError}</p>
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
              geminiConfigured={geminiConfigured}
              disabled={isProcessing}
            />

            {/* Clear Primary Action Button */}
            <div className="pt-2">
              <RunButton
                onRun={handleStart}
                onCancel={handleCancel}
                running={isProcessing}
                disabled={
                  isProcessing ||
                  (!incidentId && !logFile && !logContent && !imageFile) ||
                  (Boolean(imageError) && Boolean(imageFile))
                }
                actionLabel={imageFile ? 'Analyze Image' : 'Run Investigation'}
                stopLabel={imageFile ? 'Stop Image Analysis' : 'Stop Investigation'}
              />
            </div>
          </div>
        </div>

        {/* Center / Right Column: Progress Timeline or Report (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {imageFile ? (
            <ImageDiagnosisPanel
              fileName={imageFile.name}
              result={imageDiagnosis}
              loading={imageRunning}
              error={imageError}
            />
          ) : report ? (
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
