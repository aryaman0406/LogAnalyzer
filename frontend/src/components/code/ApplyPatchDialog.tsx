import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ApplyPatchDialogProps {
  investigationId: string
  disabled?: boolean
}

export function ApplyPatchDialog({ investigationId, disabled }: ApplyPatchDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !investigationId}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-status-warning" />
          <span>Auto-apply unavailable</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-text-primary">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
            <DialogTitle>Automatic patching is not implemented</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            The investigation can provide suggested remediation text, but it does not generate or apply source-code patches.
            Review and apply any changes manually. No files have been modified.
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs font-mono text-text-muted">
          Investigation ID: {investigationId}
        </p>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
