import { useEffect } from 'react'

/** Register a global keyboard shortcut with either (key, callback, opts) or ((e: KeyboardEvent) => void, deps). */
export function useKeyboardShortcut(
  keyOrHandler: string | ((e: KeyboardEvent) => void),
  callbackOrDeps?: (() => void) | unknown[],
  opts: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {},
) {
  useEffect(() => {
    if (typeof keyOrHandler === 'function') {
      const handler = (e: KeyboardEvent) => {
        keyOrHandler(e)
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }

    const key = keyOrHandler
    const callback = callbackOrDeps as () => void
    const handler = (e: KeyboardEvent) => {
      if (opts.meta && !e.metaKey) return
      if (opts.ctrl && !e.ctrlKey) return
      if (opts.shift && !e.shiftKey) return
      if (opts.meta && !(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        callback?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, typeof keyOrHandler === 'function' ? (Array.isArray(callbackOrDeps) ? callbackOrDeps : []) : [keyOrHandler, callbackOrDeps, opts.meta, opts.ctrl, opts.shift])
}
