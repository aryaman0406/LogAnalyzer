import { pct } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ConfidenceMeterProps {
  value: number // 0–1
  className?: string
}

export function ConfidenceMeter({ value, className = '' }: ConfidenceMeterProps) {
  const percentage = Math.round(value * 100)

  const getColor = (v: number) => {
    if (v >= 0.8) return { text: 'text-emerald-400', bar: 'from-emerald-500 to-teal-400', bg: 'bg-emerald-500/10' }
    if (v >= 0.5) return { text: 'text-amber-400', bar: 'from-amber-500 to-yellow-400', bg: 'bg-amber-500/10' }
    return { text: 'text-rose-400', bar: 'from-rose-500 to-red-400', bg: 'bg-rose-500/10' }
  }

  const { text, bar } = getColor(value)

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Diagnostic Certainty
        </span>
        <span className={`font-mono font-bold text-xs ${text}`}>
          {pct(value)}
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border/60 p-[1px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${bar} shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
        />
      </div>
    </div>
  )
}
