import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely (deduplicates conflicting utilities). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format seconds as "0:42" or "1:05". */
export function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format a UNIX timestamp to local time string. */
export function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Format a UNIX timestamp to a full date string. */
export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format timestamp alias. */
export function formatTimestamp(ts: number): string {
  return formatDate(ts)
}

/** Zero-padded step number like "01", "12". */
export function padStep(n: number): string {
  return String(n).padStart(2, '0')
}

/** Truncate string with ellipsis. */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/** Percentage from 0-1 float. */
export function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}
