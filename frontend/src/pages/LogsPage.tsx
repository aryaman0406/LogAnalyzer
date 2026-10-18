import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchLogs } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { LogViewer } from '@/components/logs/LogViewer'
import { LogSparkline } from '@/components/logs/LogSparkline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Search, Filter, RefreshCw, FileText, AlertCircle, Terminal, Activity } from 'lucide-react'

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const initialLevel = searchParams.get('level') || ''

  const [query, setQuery] = useState(initialQ)
  const [level, setLevel] = useState(initialLevel)
  const [page, setPage] = useState(0)
  const pageSize = 100

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['logs', level, query, page],
    queryFn: () =>
      fetchLogs({
        level: level || undefined,
        q: query || undefined,
        offset: page * pageSize,
        limit: pageSize,
      }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setSearchParams((prev) => {
      if (query) prev.set('q', query)
      else prev.delete('q')
      if (level) prev.set('level', level)
      else prev.delete('level')
      return prev
    })
  }

  const logs = data?.rows || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Cluster Log Stream Explorer
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Structured JSON log telemetry with real-time anomaly indexing and citation markers.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 h-9 rounded-xl text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh Stream</span>
        </Button>
      </div>

      {/* Sparkline Telemetry */}
      <GlassCard className="p-4 space-y-2" hover={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose-400" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-text-muted">
              Error Velocity & Traffic Density
            </span>
          </div>
          <span className="text-xs text-text-secondary font-mono">
            Showing <strong className="text-text-primary">{logs.length}</strong> of{' '}
            <strong className="text-text-primary">{total}</strong> records
          </span>
        </div>
        <LogSparkline logs={logs} />
      </GlassCard>

      {/* Filter toolbar */}
      <GlassCard className="p-3" hover={false}>
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by exception, request_id, service..."
              className="w-full rounded-xl border border-border bg-surface/60 pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent font-mono transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-text-muted" />
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value)
                setPage(0)
              }}
              className="rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono transition-all"
            >
              <option value="">All Severities</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>

          <Button type="submit" size="sm" variant="default" className="h-9 px-4 rounded-xl font-bold">
            Filter Logs
          </Button>
          {(query || level) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery('')
                setLevel('')
                setPage(0)
              }}
              className="h-9 rounded-xl text-xs"
            >
              Reset
            </Button>
          )}
        </form>
      </GlassCard>

      {/* Main log list */}
      <GlassCard className="p-4 space-y-3" hover={false}>
        {isLoading ? (
          <div className="space-y-2 py-6">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-rose-400 space-y-2">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs">Failed to load logs: {(error as Error).message}</p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Matching Logs"
            description="Try adjusting your search criteria or clearing active level filters."
          />
        ) : (
          <>
            <LogViewer logs={logs} total={total} highlightQuery={query} />

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs font-mono">
                <span className="text-text-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="h-8 px-3 rounded-lg"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 px-3 rounded-lg"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  )
}
export default LogsPage
