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
    <div className="space-y-3.5 pt-3 border-t border-border/60">
      <div className="text-[11px] font-mono font-semibold tracking-wider text-text-muted uppercase">
        Autonomous Capabilities & Engine
      </div>

      {/* Model Selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Bot className="h-3 w-3 text-accent" />
            <span>Inference Model Engine</span>
          </span>
          <span className="text-[9px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" /> Ready
          </span>
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono disabled:opacity-50 transition-all cursor-pointer"
        >
          <option value="gemini">Google Gemini 2.0 Flash (Recommended)</option>
          <option value="openai">OpenAI (gpt-4o-mini)</option>
          <option value="anthropic">Anthropic (claude-3-5-haiku)</option>
          <option value="local">Diagnostic Engine (Offline Safe Mode)</option>
        </select>
      </div>

      <div className="space-y-2 bg-surface/30 p-3 rounded-xl border border-border/60">
        <Toggle
          checked={useAnomalyDetector}
          onChange={setUseAnomalyDetector}
          disabled={disabled}
          label={
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Drain3 Anomaly Filter</span>
            </div>
          }
          description="Pre-filters cluster logs with Drain3 template clustering & LSTM"
        />

        <div className="h-px bg-border/40 my-1" />

        <Toggle
          checked={useTools}
          onChange={setUseTools}
          disabled={disabled}
          label={
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              <span>Diagnostic Tool Calling</span>
            </div>
          }
          description="Permits read-only AST lookups, log grep, git diff, and RAG retrieval"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-between">
          <span>Target Log File</span>
          <FileSearch className="h-3 w-3 text-text-muted" />
        </label>
        <input
          type="text"
          value={logFile}
          onChange={(e) => setLogFile(e.target.value)}
          disabled={disabled}
          placeholder="Default: data/logs/sample_app.jsonl"
          className="w-full rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent font-mono disabled:opacity-50 transition-all"
        />
      </div>
    </div>
  )
}
