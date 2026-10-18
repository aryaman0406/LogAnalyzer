import { useQuery } from '@tanstack/react-query'
import { fetchIncidents } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AlertTriangle, ChevronDown, Flame, ShieldAlert, Bug } from 'lucide-react'
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
        <label className="text-[11px] font-mono font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
          <Bug size={13} className="text-accent" />
          <span>Incident Scenario</span>
        </label>
        <span className="text-[10px] text-text-muted font-mono">
          {incidents?.length || 0} presets
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-xl" />
      ) : isError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs p-3">
          Failed to load catalog incidents from API.
        </div>
      ) : (
        <div className="relative">
          <select
            value={activeId}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
            className={cn(
              'appearance-none w-full h-10 px-3.5 pr-9',
              'bg-surface/70 border border-border rounded-xl',
              'text-xs font-medium text-text-primary outline-none',
              'focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
            )}
          >
            {incidents?.map((i: Incident) => (
              <option key={i.id} value={i.id} className="bg-bg-raised text-text-primary py-1">
                {i.id} • {i.title}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>
      )}

      {/* Incident Summary Card */}
      {current && (
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/30 backdrop-blur-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Flame size={13} />
              </div>
              <span className="font-semibold text-xs text-text-primary truncate">
                {current.title}
              </span>
            </div>
            <Badge variant="error" dot pulse className="text-[9px]">
              CRITICAL
            </Badge>
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            {current.description}
          </p>

          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>Scenario ID: {current.id}</span>
            <span className="text-emerald-400">● Live Simulation</span>
          </div>
        </div>
      )}
    </div>
  )
}
