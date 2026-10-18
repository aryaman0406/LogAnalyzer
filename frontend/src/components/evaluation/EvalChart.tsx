import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import type { EvalRow } from '@/types'

interface EvalChartProps {
  rows: EvalRow[]
}

export function EvalChart({ rows }: EvalChartProps) {
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return []

    // Group by setup (A, B, C, D, E)
    const setupLabels: Record<string, string> = {
      A: 'Setup A (Generic LLM)',
      B: 'Setup B (+Tools)',
      C: 'Setup C (+Tools+Anomaly)',
      D: 'Setup D (Fine-Tuned+Tools)',
      E: 'Setup E (Fine-Tuned+All+RAG)',
    }
    const setups: Record<string, { setup: string; avgScore: number; avgSteps: number; hallucinations: number; count: number }> = {}

    // Only aggregate executed trials with valid scores
    const completedRows = rows.filter(
      (r) => r.judge_score && r.judge_score !== 'N/A' && !String((r as any).status || '').includes('NOT RUN')
    )

    completedRows.forEach((r) => {
      const key = r.setup || 'D'
      if (!setups[key]) {
        setups[key] = {
          setup: setupLabels[key] || `Setup ${key}`,
          avgScore: 0,
          avgSteps: 0,
          hallucinations: 0,
          count: 0
        }
      }
      const s = setups[key]
      s.count += 1
      s.avgScore += parseFloat(r.judge_score) || 0
      s.avgSteps += parseFloat(r.steps) || 0
      if (r.hallucinated?.toLowerCase() === 'true' || r.hallucinated === '1') {
        s.hallucinations += 1
      }
    })

    return Object.values(setups)
      .filter((s) => s.count > 0)
      .map((s) => ({
        setup: s.setup,
        'Judge Score (%)': Math.round((s.avgScore / s.count) * 100),
        'Avg Steps': Number((s.avgSteps / s.count).toFixed(1)),
        'Hallucination Rate (%)': Math.round((s.hallucinations / s.count) * 100),
      }))
  }, [rows])

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-text-muted italic">
        No evaluation chart data to display.
      </div>
    )
  }

  return (
    <div className="h-72 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 12%, 17%)" />
          <XAxis dataKey="setup" stroke="hsl(218, 15%, 55%)" fontSize={11} />
          <YAxis stroke="hsl(218, 15%, 55%)" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(220, 16%, 10%)',
              borderColor: 'hsl(220, 12%, 17%)',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'hsl(218, 30%, 92%)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Bar dataKey="Judge Score (%)" fill="hsl(234, 89%, 74%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Avg Steps" fill="hsl(38, 92%, 67%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Hallucination Rate (%)" fill="hsl(0, 84%, 73%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
