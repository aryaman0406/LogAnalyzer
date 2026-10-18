import { useCallback, useState, useRef } from 'react'
import { startInvestigation, streamInvestigation } from '@/lib/api'
import type { SSEEvent, StartRequest, InvestigationReport } from '@/types'

export interface InvestigationState {
  running: boolean
  events: SSEEvent[]
  report: InvestigationReport | null
  investigationId: string | null
  elapsed: number
  error: string | null
}

export function useInvestigation() {
  const [state, setState] = useState<InvestigationState>({
    running: false,
    events: [],
    report: null,
    investigationId: null,
    elapsed: 0,
    error: null,
  })

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const run = useCallback(async (req: StartRequest) => {
    // Cancel any previous run
    abortRef.current?.abort()
    if (timerRef.current) clearInterval(timerRef.current)

    const controller = new AbortController()
    abortRef.current = controller

    setState({
      running: true,
      events: [],
      report: null,
      investigationId: null,
      elapsed: 0,
      error: null,
    })

    // Elapsed timer
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsed: Math.floor((Date.now() - start) / 1000) }))
    }, 1000)

    try {
      const { investigation_id } = await startInvestigation(req)
      setState((prev) => ({ ...prev, investigationId: investigation_id }))

      for await (const event of streamInvestigation(investigation_id, controller.signal)) {
        if (event.type === 'done') {
          setState((prev) => ({ ...prev, running: false }))
          break
        }
        if (event.type === 'final') {
          setState((prev) => ({
            ...prev,
            events: [...prev.events, event],
            report: event.content as unknown as InvestigationReport,
          }))
        } else if (event.type === 'error') {
          setState((prev) => ({
            ...prev,
            events: [...prev.events, event],
            error: (event.content as { message?: string })?.message || 'Investigation failed',
          }))
        } else {
          setState((prev) => ({
            ...prev,
            events: [...prev.events, event],
          }))
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Request failed',
        }))
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setState((prev) => ({ ...prev, running: false }))
    }
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    if (timerRef.current) clearInterval(timerRef.current)
    setState((prev) => ({ ...prev, running: false }))
  }, [])

  return { ...state, run, cancel }
}
