import type {
  Incident, LogsResponse, SourceFile, Investigation,
  StartRequest, EvalResponse, ModelMetricsResponse, SSEEvent, PatchPreview,
  ModelStatusInfo,
} from '@/types'

/** API base URL from environment, never hardcoded. */
const API = import.meta.env.VITE_API_BASE_URL || ''

// ── Helpers ─────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ── Incidents ───────────────────────────────────────────

export function fetchIncidents(): Promise<Incident[]> {
  return get('/api/incidents')
}

// ── Logs ────────────────────────────────────────────────

export function fetchLogs(params: {
  level?: string
  q?: string
  offset?: number
  limit?: number
}): Promise<LogsResponse> {
  const sp = new URLSearchParams()
  if (params.level) sp.set('level', params.level)
  if (params.q) sp.set('q', params.q)
  if (params.offset !== undefined) sp.set('offset', String(params.offset))
  if (params.limit !== undefined) sp.set('limit', String(params.limit))
  return get(`/api/logs?${sp}`)
}

// ── Files ───────────────────────────────────────────────

export function fetchFile(path: string, startLine = 1): Promise<SourceFile> {
  const sp = new URLSearchParams({ path, start_line: String(startLine) })
  return get(`/api/files?${sp}`)
}

// ── Investigations ──────────────────────────────────────

export function startInvestigation(req: StartRequest): Promise<{ investigation_id: string }> {
  return post('/api/investigations', req)
}

export function fetchInvestigation(id: string): Promise<Investigation> {
  return get(`/api/investigations/${id}`)
}

export function fetchHistory(): Promise<Investigation[]> {
  return get('/api/investigations')
}

/** Connect to the SSE stream and yield events. */
export async function* streamInvestigation(
  id: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API}/api/investigations/${id}/stream`, { signal })
  if (!res.ok) throw new Error(`SSE stream failed: ${res.status}`)
  if (!res.body) throw new Error('SSE stream body unavailable')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let pending = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })

      const chunks = pending.split('\n\n')
      pending = chunks.pop() || ''

      for (const chunk of chunks) {
        const dataLine = chunk
          .split('\n')
          .find((s) => s.startsWith('data: '))
        if (!dataLine) continue
        const event = JSON.parse(dataLine.slice(6)) as SSEEvent
        yield event
        if (event.type === 'done') return
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ── Patch ───────────────────────────────────────────────

export function fetchPatchPreview(id: string): Promise<PatchPreview> {
  return post(`/api/investigations/${id}/patch/preview`)
}

export function applyPatch(id: string): Promise<unknown> {
  return post(`/api/investigations/${id}/patch/apply`, { approved: true })
}

// ── Eval & Model ────────────────────────────────────────

export function fetchEvalResults(): Promise<EvalResponse> {
  return get('/api/eval/results')
}

export function fetchModelMetrics(): Promise<ModelMetricsResponse> {
  return get('/api/model/metrics')
}

export function fetchModels(): Promise<{ providers: Array<{ id: string; name: string; model: string; available: boolean; adapter_ready?: boolean }> }> {
  return get('/api/models')
}

export function fetchModelStatus(): Promise<ModelStatusInfo> {
  return get('/api/models/status')
}
