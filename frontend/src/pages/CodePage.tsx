import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchFile, fetchPatchPreview } from '@/lib/api'
import { GlassCard } from '@/components/ui/GlassCard'
import { CodeViewer } from '@/components/code/CodeViewer'
import { DiffViewer } from '@/components/code/DiffViewer'
import { ApplyPatchDialog } from '@/components/code/ApplyPatchDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { FileCode, GitCompare, Search, RefreshCw, GitPullRequest, Code2 } from 'lucide-react'

export function CodePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFile = searchParams.get('file') || 'sample_app/incidents.py'
  const initialId = searchParams.get('id') || ''

  const [filePath, setFilePath] = useState(initialFile)
  const [investigationId, setInvestigationId] = useState(initialId)
  const [activeTab, setActiveTab] = useState<'source' | 'diff'>('source')

  // Query source file
  const {
    data: fileData,
    isLoading: fileLoading,
    refetch: refetchFile,
  } = useQuery({
    queryKey: ['file', filePath],
    queryFn: () => fetchFile(filePath),
    enabled: !!filePath,
  })

  // Query patch preview
  const {
    data: patchData,
    isLoading: patchLoading,
    refetch: refetchPatch,
  } = useQuery({
    queryKey: ['patch', investigationId],
    queryFn: () => fetchPatchPreview(investigationId),
    enabled: !!investigationId,
  })

  const handleSearchFile = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams((prev) => {
      prev.set('file', filePath)
      if (investigationId) prev.set('id', investigationId)
      return prev
    })
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Code & Diff Inspector
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Inspect repository AST trees, cited line references, and AI-generated patch diffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {investigationId && (
            <ApplyPatchDialog investigationId={investigationId} />
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              refetchFile()
              if (investigationId) refetchPatch()
            }}
            className="gap-1.5 h-9 rounded-xl font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <span>Reload</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <GlassCard className="p-3" hover={false}>
        <form onSubmit={handleSearchFile} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. sample_app/incidents.py"
              className="w-full rounded-xl border border-border bg-surface/60 pl-9 pr-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div className="md:col-span-4 relative">
            <Code2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={investigationId}
              onChange={(e) => setInvestigationId(e.target.value)}
              placeholder="Investigation ID (optional for patch diff)"
              className="w-full rounded-xl border border-border bg-surface/60 pl-9 pr-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div className="md:col-span-2 flex items-center">
            <Button type="submit" size="sm" variant="default" className="w-full h-9 rounded-xl font-bold">
              Load Target
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Main Tabs Container */}
      <GlassCard className="p-4 space-y-3" hover={false}>
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2 p-1 bg-surface/40 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveTab('source')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'source'
                  ? 'bg-accent text-bg-base shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Source Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'diff'
                  ? 'bg-accent text-bg-base shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Proposed Patch Diff</span>
            </button>
          </div>

          {patchData?.suggested_fix && (
            <Badge variant="success" dot pulse>
              PATCH STAGED
            </Badge>
          )}
        </div>

        {/* Tab view */}
        {activeTab === 'source' ? (
          fileLoading ? (
            <div className="space-y-2 py-6">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : (
            <CodeViewer file={fileData || null} />
          )
        ) : patchLoading ? (
          <div className="space-y-2 py-6">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <DiffViewer diff={patchData?.diff || ''} />
        )}
      </GlassCard>
    </div>
  )
}
export default CodePage
