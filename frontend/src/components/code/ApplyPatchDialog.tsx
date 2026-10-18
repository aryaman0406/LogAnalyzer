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
import { AlertTriangle, CheckCircle, Loader2, GitPullRequest } from 'lucide-react'
import { applyPatch } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface ApplyPatchDialogProps {
  investigationId: string
  disabled?: boolean
}

export function ApplyPatchDialog({ investigationId, disabled }: ApplyPatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [applying, setApplying] = useState(false)
  const { toast } = useToast()

  const handleApply = async () => {
    setApplying(true)
    try {
      await applyPatch(investigationId)
      toast({
        title: 'Patch applied',
        description: 'The fix has been staged to your workspace branch.',
        variant: 'success',
      })
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Apply failed',
        description: err instanceof Error ? err.message : 'Backend does not support auto-applying patch',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          disabled={disabled || !investigationId}
          className="gap-1.5"
        >
          <GitPullRequest className="h-3.5 w-3.5" />
          <span>Apply Patch to Codebase</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-text-primary">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <DialogTitle>Apply Suggested Code Patch?</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This will apply the LLM-generated patch directly to the target file in the active workspace repository.
            Make sure you have reviewed the unified diff before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded bg-surface border border-border text-xs text-text-secondary space-y-1">
          <div className="flex items-center justify-between font-medium text-text-primary">
            <span>Investigation ID:</span>
            <span className="font-mono text-[11px] text-accent">{investigationId}</span>
          </div>
          <p className="text-[11px] text-text-muted">
            Safety check: We recommend running test suites after patch execution.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={applying}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleApply} disabled={applying} className="gap-1.5">
            {applying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Confirm & Apply</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
