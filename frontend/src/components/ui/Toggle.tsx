import React from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps {
  label: React.ReactNode
  detail?: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  badge?: string
  disabled?: boolean
}

export function Toggle({
  label,
  detail,
  description,
  checked,
  onChange,
  badge,
  disabled = false,
}: ToggleProps) {
  const subtitle = description || detail

  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 py-2 px-0 border-0 bg-transparent text-left w-full group transition-opacity',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      )}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span
        className={cn(
          'relative w-7 h-4 rounded-full border flex-shrink-0',
          'transition-colors duration-200',
          checked
            ? 'bg-accent-muted border-accent/50'
            : 'bg-surface border-border-hover',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full',
            'transition-all duration-200',
            checked
              ? 'translate-x-3 bg-accent'
              : 'translate-x-0 bg-text-secondary',
          )}
        />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
          {label}
          {badge && (
            <span className="text-[8px] font-mono font-medium text-accent bg-accent-muted px-1 py-0.5 rounded">
              {badge}
            </span>
          )}
        </span>
        {subtitle && (
          <span className="text-[11px] text-text-muted mt-0.5 leading-normal">
            {subtitle}
          </span>
        )}
      </span>
    </button>
  )
}
