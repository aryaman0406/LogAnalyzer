import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchHistory } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { HistoryTable } from '@/components/history/HistoryTable'
import { TraceReplay } from '@/components/history/TraceReplay'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { History, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import type { Investigation } from '@/types'

export function HistoryPage() {
  const [selectedInv, setSelectedInv] = useState<Investigation | null>(null)

  const { data: investigations = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  })

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Audit History & Trace Replay
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Audit past reasoning traces, verify diagnostic reports, and replay step-by-step tool actions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 h-9 rounded-xl font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh Audit</span>
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Table list */}
        <div className={selectedInv ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <GlassCard className="p-4 space-y-3" hover={false}>
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
                  Recorded Sessions ({investigations.length})
                </span>
              </div>
              {selectedInv && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInv(null)}
                  className="text-xs h-7 px-2.5 rounded-lg"
                >
                  Close Inspection
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 py-6">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : error ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-rose-400 space-y-2">
                <AlertCircle className="h-6 w-6" />
                <p className="text-xs">Failed to load history: {(error as Error).message}</p>
              </div>
            ) : investigations.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Previous Investigations"
                description="Completed agent investigations will be audited and cataloged here automatically."
              />
            ) : (
              <HistoryTable
                investigations={investigations}
                selectedId={selectedInv?.id || null}
                onSelect={(inv) => setSelectedInv(inv)}
              />
            )}
          </GlassCard>
        </div>

        {/* Selected trace replay */}
        {selectedInv && (
          <div className="lg:col-span-5">
            <TraceReplay
              investigation={selectedInv}
              onClose={() => setSelectedInv(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
export default HistoryPage
