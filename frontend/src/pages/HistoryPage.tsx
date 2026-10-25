import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchHistory } from '@/lib/api'
import { HistoryTable } from '@/components/history/HistoryTable'
import { TraceReplay } from '@/components/history/TraceReplay'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import { History, RefreshCw, AlertCircle, Clock, Search } from 'lucide-react'
import type { Investigation } from '@/types'

export function HistoryPage() {
  const [selectedInv, setSelectedInv] = useState<Investigation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: investigations = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  })

  const filtered = investigations.filter((inv) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const id = inv.id.toLowerCase()
    const inc = (inv.incident_id || '').toLowerCase()
    const rootCause =
      inv.result && 'root_cause' in inv.result ? (inv.result.root_cause as string).toLowerCase() : ''
    return id.includes(q) || inc.includes(q) || rootCause.includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Audit History & Trace Replay
          </h1>
          <p className="text-base text-text-secondary mt-1">
            Review past diagnostic reports, inspect evidence citations, and replay step-by-step tool actions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 h-9 px-4 font-semibold text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh List</span>
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table list */}
        <div className={selectedInv ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <div className="surface-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-caption font-mono font-semibold uppercase tracking-wider text-text-muted">
                  Recorded Sessions ({filtered.length} of {investigations.length})
                </span>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ID, scenario, or cause..."
                  className="w-full h-8 pl-9 pr-3 rounded border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-6">
                <Skeleton className="h-10 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
                <Skeleton className="h-12 w-full rounded" />
              </div>
            ) : error ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-status-error space-y-2">
                <AlertCircle className="h-6 w-6" />
                <p className="text-sm">Failed to load history: {(error as Error).message}</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Investigations Found"
                description={
                  searchQuery
                    ? 'No investigations match your current filter query.'
                    : 'Completed agent investigations will appear here automatically.'
                }
              />
            ) : (
              <HistoryTable
                investigations={filtered}
                selectedId={selectedInv?.id || null}
                onSelect={(inv) => setSelectedInv(inv)}
              />
            )}
          </div>
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
