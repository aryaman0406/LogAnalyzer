// ── Shared TypeScript interfaces ──────────────────────────
export interface Incident {
  id: string
  title: string
  description: string
}

export interface LogLine {
  line_number: number
  timestamp: string
  level: string
  message: string
  cited?: boolean
}

export interface LogsResponse {
  rows: LogLine[]
  total: number
}

export interface SourceFile {
  path: string
  start_line: number
  lines: string[]
}

export interface SSEEvent {
  type: 'thought' | 'tool_call' | 'tool_result' | 'final' | 'error' | 'done'
  step: number
  timestamp: number
  content: Record<string, unknown>
}

export interface MlTopLine {
  line_no: number
  score: number
  section?: string
  text: string
}

export interface MlRankingResult {
  available: boolean
  model_version?: string
  top_lines?: MlTopLine[]
  reason?: string
  warnings?: string[]
}

export interface LlmFallback {
  used: boolean
  reason?: string | null
}

export interface InvestigationReport {
  incident_id?: string
  severity?: string
  affected_service?: string
  root_cause: string
  confidence?: number | null
  confidence_basis?: string | null
  evidence: Evidence[]
  suggested_fix: string
  affected_file: string
  affected_function: string
  hallucination_warnings: string[]
  ml_ranking?: MlRankingResult
  llm_fallback?: LlmFallback
}

export interface Evidence {
  type: 'log' | 'code' | 'git' | 'anomaly' | 'rag' | string
  source?: string
  reference: string
  detail: string
}

export interface InvestigationState {
  incident_id: string | null
  status: string
  hypotheses: string[]
  evidence: Evidence[]
  tools_used: string[]
  affected_files: string[]
  affected_functions: string[]
  severity: string
  confidence?: number | null
  confidence_basis?: string | null
}

export interface Investigation {
  id: string
  incident_id: string | null
  status: 'queued' | 'running' | 'complete' | 'error'
  created_at: number
  result: InvestigationReport | { error: string } | null
  trace: SSEEvent[]
  log_file: string
  state?: InvestigationState
}

export interface StartRequest {
  incident_id: string | null
  log_file?: string
  use_anomaly_detector: boolean
  use_tools: boolean
  provider?: string
  model?: string
}

export interface ModelStatusInfo {
  active_provider: string
  active_model: string
  adapter_loaded: boolean
  status: string
  hardware?: Record<string, unknown>
  anomaly_detector?: {
    available: boolean
    status: string
    model_path?: string
  }
  rag?: {
    available: boolean
    status: string
    index_path?: string
  }
  external_ml_service?: {
    configured: boolean
    available: boolean
    status: string
    base_url?: string
  }
}

export interface EvalRow {
  incident_id: string
  setup: 'A' | 'B' | 'C' | 'D' | 'E' | string
  trial: string
  judge_score: string
  steps: string
  hallucinated: string
  correct_file?: string | number
  correct_function?: string | number
  tool_calls?: string | number
  model_name?: string
  provider?: string
  cost?: string
}

export interface EvalResponse {
  available: boolean
  rows: EvalRow[]
}

export interface ModelMetric {
  model: string
  precision: number
  recall: number
  f1: number
  threshold: number
  confusion_matrix?: number[][]
}

export interface ModelMetricsResponse {
  available: boolean
  models: ModelMetric[]
}

export interface PatchPreview {
  diff: string
  suggested_fix: string
  message: string
}
