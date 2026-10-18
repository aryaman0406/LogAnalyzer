import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FailureDrilldown } from './FailureDrilldown'
import { ChevronRight } from 'lucide-react'
import type { EvalRow } from '@/types'

interface EvalTableProps {
  rows: EvalRow[]
}

export function EvalTable({ rows }: EvalTableProps) {
  const [selectedRow, setSelectedRow] = useState<EvalRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleRowClick = (row: EvalRow) => {
    setSelectedRow(row)
    setModalOpen(true)
  }

  return (
    <>
      <div className="border border-border rounded-md overflow-hidden bg-surface/30">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border/80 text-[10px] uppercase font-semibold text-text-muted tracking-wider">
            <tr>
              <th className="px-4 py-2.5">Incident ID</th>
              <th className="px-4 py-2.5">Setup</th>
              <th className="px-4 py-2.5">Configuration</th>
              <th className="px-4 py-2.5">Trial</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Judge Score</th>
              <th className="px-4 py-2.5">Steps</th>
              <th className="px-4 py-2.5">Hallucination</th>
              <th className="px-4 py-2.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row, idx) => {
              const statusStr = String((row as any).status || '')
              const isNotRun = !row.judge_score || row.judge_score === 'N/A' || statusStr.includes('NOT RUN')
              const isHallucinated =
                row.hallucinated?.toLowerCase() === 'true' || row.hallucinated === '1'
              const score = isNotRun ? null : (parseFloat(row.judge_score) || 0)

              const getStatusBadge = () => {
                const upper = statusStr.toUpperCase()
                if (upper.includes('CONFIGURATION ERROR') || (row as any).error_category === 'credentials_unavailable') {
                  return <Badge variant="warn" className="text-[9px] font-mono">CONFIG ERROR</Badge>
                }
                if (upper.includes('NOT RUN')) {
                  return <Badge variant="warn" className="text-[9px] font-mono">NOT RUN</Badge>
                }
                if (upper.includes('FAILED')) {
                  return <Badge variant="error" className="text-[9px] font-mono">FAILED</Badge>
                }
                if (isNotRun) {
                  return <Badge variant="warn" className="text-[9px] font-mono">NOT RUN</Badge>
                }
                return <Badge variant="success" className="text-[9px] font-mono">COMPLETED</Badge>
              }

              return (
                <tr
                  key={idx}
                  onClick={() => handleRowClick(row)}
                  className="cursor-pointer transition-colors hover:bg-surface/70"
                >
                  <td className="px-4 py-3 font-mono font-medium text-text-primary text-[11px]">
                    {row.incident_id}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    <Badge variant="secondary">Setup {row.setup}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-[11px]">
                    {(row as any).setup_name || `Setup ${row.setup}`}
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono">#{row.trial}</td>
                  <td className="px-4 py-3">
                    {getStatusBadge()}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {isNotRun ? (
                      <span className="text-text-muted text-xs">N/A</span>
                    ) : (
                      <span
                        className={`font-semibold ${
                          score! >= 0.8
                            ? 'text-success'
                            : score! >= 0.5
                            ? 'text-amber-400'
                            : 'text-error'
                        }`}
                      >
                        {Math.round(score! * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{isNotRun ? '-' : row.steps}</td>
                  <td className="px-4 py-3">
                    {isNotRun ? (
                      <span className="text-text-muted text-[11px]">-</span>
                    ) : (
                      <Badge variant={isHallucinated ? 'error' : 'success'}>
                        {isHallucinated ? 'Flagged' : 'None'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    <ChevronRight className="h-4 w-4 inline-block opacity-60" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <FailureDrilldown
        row={selectedRow}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
