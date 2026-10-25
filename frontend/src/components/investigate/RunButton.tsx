import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/Kbd'
import { Square, Loader2, Play } from 'lucide-react'
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
        className="w-full h-11 rounded font-semibold text-sm flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Stop Investigation</span>
        </span>
        <span className="flex items-center gap-1.5 opacity-90 text-caption font-mono">
          <Square className="h-3.5 w-3.5 fill-current" />
          <Kbd>⌘ Enter</Kbd>
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
      className="w-full h-11 rounded font-semibold text-sm flex items-center justify-between transition-colors"
    >
      <span className="flex items-center gap-2">
        <Play className="h-4 w-4 fill-current" />
        <span>Run Investigation</span>
      </span>
      <Kbd className="bg-black/20 text-bg-base border-black/30 text-caption">
        ⌘ Enter
      </Kbd>
    </Button>
  )
}
