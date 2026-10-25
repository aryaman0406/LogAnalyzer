import { Toggle } from '@/components/ui/Toggle'
import { Sparkles, Wrench, FileSearch, Bot, CheckCircle2 } from 'lucide-react'

interface InvestigationControlsProps {
  useAnomalyDetector: boolean
  setUseAnomalyDetector: (val: boolean) => void
  useTools: boolean
  setUseTools: (val: boolean) => void
  logFile: string
  setLogFile: (val: string) => void
  provider: string
  setProvider: (val: string) => void
  disabled?: boolean
}

export function InvestigationControls({
  useAnomalyDetector,
  setUseAnomalyDetector,
  useTools,
  setUseTools,
  logFile,
  setLogFile,
  provider,
  setProvider,
  disabled = false,
}: InvestigationControlsProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="text-caption font-mono font-semibold tracking-wider text-text-muted uppercase">
        Engine Configuration
      </div>

      {/* Model Selection */}
      <div className="space-y-1.5">
        <label className="text-caption font-mono uppercase text-text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-accent" />
            <span>LLM Provider</span>
          </span>
          <span className="text-caption text-status-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={disabled}
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent font-mono disabled:opacity-50 transition-colors cursor-pointer"
        >
          <option value="gemini">Google Gemini 2.0 Flash (Recommended)</option>
          <option value="openai">OpenAI (gpt-4o-mini)</option>
          <option value="anthropic">Anthropic (claude-3-5-haiku)</option>
          <option value="local">Diagnostic Engine (Offline Safe Fallback)</option>
        </select>
      </div>

      <div className="space-y-3 bg-surface p-3.5 rounded border border-border">
        <Toggle
          checked={useAnomalyDetector}
          onChange={setUseAnomalyDetector}
          disabled={disabled}
          label={
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Drain3 Anomaly Filter</span>
            </div>
          }
          description="Pre-filters cluster logs with Drain3 template clustering"
        />

        <div className="h-px bg-border my-1" />

        <Toggle
          checked={useTools}
          onChange={setUseTools}
          disabled={disabled}
          label={
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Wrench className="h-4 w-4 text-status-warning" />
              <span>Autonomous Diagnostics</span>
            </div>
          }
          description="Permits read-only AST lookups, log grep, and git diff"
        />
      </div>

      {/* Target Log File */}
      <div className="space-y-1.5">
        <label className="text-caption font-mono uppercase text-text-muted flex items-center justify-between">
          <span>Target Log File</span>
          <FileSearch className="h-3.5 w-3.5 text-text-muted" />
        </label>
        <input
          type="text"
          value={logFile}
          onChange={(e) => setLogFile(e.target.value)}
          disabled={disabled}
          placeholder="e.g. data/logs/real_log_1.txt"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent font-mono disabled:opacity-50 transition-colors"
        />
      </div>
    </div>
  )
}
