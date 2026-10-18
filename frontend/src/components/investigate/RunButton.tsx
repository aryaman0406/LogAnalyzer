import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/Kbd'
import { Play, Square, Loader2, Sparkles } from 'lucide-react'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'

interface RunButtonProps {
  onRun: () => void
  onCancel: () => void
  running: boolean
  disabled?: boolean
}

export function RunButton({
  onRun,
  onCancel,
  running,
  disabled = false,
}: RunButtonProps) {
  useKeyboardShortcut(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (running) {
          onCancel()
        } else if (!disabled) {
          onRun()
        }
      }
    },
    [running, disabled, onRun, onCancel]
  )

  if (running) {
    return (
      <Button
        variant="danger"
        size="lg"
        onClick={onCancel}
        className="w-full h-11 rounded-xl flex items-center justify-between group shadow-lg bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
      >
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
          <span className="font-bold text-xs">Cancel Investigation</span>
        </span>
        <span className="flex items-center gap-1.5 opacity-80">
          <Square className="h-3 w-3 fill-current" />
          <Kbd className="bg-black/40 text-rose-200 border-rose-500/30">⌘ Enter</Kbd>
        </span>
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size="lg"
      disabled={disabled}
      onClick={onRun}
      className="w-full h-11 rounded-xl flex items-center justify-between group shadow-[0_0_25px_rgba(129,140,248,0.35)] bg-accent hover:bg-accent-hover text-bg-base transition-all hover:scale-[1.01] active:scale-[0.99]"
    >
      <span className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 fill-current text-bg-base transition-transform group-hover:rotate-12" />
        <span className="font-bold text-xs tracking-tight">Run Autonomous Agent</span>
      </span>
      <Kbd className="bg-black/20 text-bg-base font-semibold border-black/30">
        ⌘ Enter
      </Kbd>
    </Button>
  )
}
