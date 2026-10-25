import { useQuery } from '@tanstack/react-query'
import { fetchIncidents } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ChevronDown, Bug, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import type { Incident } from '@/types'

interface IncidentPickerProps {
  selected?: string
  selectedId?: string
  onSelect: (id: string) => void
  disabled?: boolean
}

export function IncidentPicker({
  selected,
  selectedId,
  onSelect,
  disabled = false,
}: IncidentPickerProps) {
  const activeId = selected || selectedId || ''

  const { data: incidents, isLoading, isError } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
  })

  const current = incidents?.find((i) => i.id === activeId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-caption font-mono font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
          <Bug className="h-4 w-4 text-accent" />
          <span>Incident Scenario</span>
        </label>
        <span className="text-caption text-text-muted font-mono">
          {incidents?.length || 0} scenarios
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-10 w-full rounded" />
      ) : isError ? (
        <div className="rounded border border-status-error-border bg-status-error-bg text-status-error text-sm p-3">
          Failed to load catalog incidents from API.
        </div>
      ) : (
        <div className="relative">
          <select
            value={activeId}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
            className={cn(
              'appearance-none w-full h-10 px-3 pr-9',
              'bg-surface border border-border rounded',
              'text-sm font-medium text-text-primary outline-none',
              'focus:border-accent focus:ring-2 focus:ring-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {incidents?.map((i: Incident) => (
              <option key={i.id} value={i.id} className="bg-background-raised text-text-primary py-1">
                {i.id} — {i.title}
              </option>
            ))}
          </select>
          <ChevronDown
            className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>
      )}

      {/* Incident Summary Card */}
      {current && (
        <div className="p-3.5 rounded border border-border bg-surface space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-text-primary truncate">
              {current.title}
            </span>
            <Badge variant="error" className="uppercase shrink-0">
              HIGH
            </Badge>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            {current.description}
          </p>

          <div className="pt-2 border-t border-border flex items-center justify-between text-caption font-mono text-text-muted">
            <span>Scenario: {current.id}</span>
            <span className="text-status-success font-medium">Ready</span>
          </div>
        </div>
      )}
    </div>
  )
}
