import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import type { LogLine } from '@/types'

interface LogSparklineProps {
  logs: LogLine[]
}

export function LogSparkline({ logs }: LogSparklineProps) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return []

    // Group logs into 10 buckets
    const bucketCount = 12
    const bucketSize = Math.max(1, Math.ceil(logs.length / bucketCount))
    const buckets: { bucket: string; errors: number; total: number }[] = []

    for (let i = 0; i < logs.length; i += bucketSize) {
      const slice = logs.slice(i, i + bucketSize)
      const errorCount = slice.filter((l) =>
        ['ERROR', 'CRITICAL', 'FATAL'].includes(l.level?.toUpperCase())
      ).length
      buckets.push({
        bucket: `P${Math.floor(i / bucketSize) + 1}`,
        errors: errorCount,
        total: slice.length,
      })
    }

    return buckets
  }, [logs])

  if (chartData.length === 0) return null

  return (
    <div className="h-16 w-full pt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0, 84%, 73%)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="hsl(0, 84%, 73%)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="bucket" hide />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as { errors: number; total: number }
                return (
                  <div className="rounded border border-border bg-bg-overlay px-2 py-1 text-[10px] text-text-primary shadow-lg backdrop-blur">
                    <span className="text-error font-semibold">{data.errors} errors</span> / {data.total} logs
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="errors"
            stroke="hsl(0, 84%, 73%)"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#errorGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
