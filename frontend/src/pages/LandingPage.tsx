import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Brain,
  Check,
  Clipboard,
  Cpu,
  Database,
  GitBranch,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Terminal,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchIncidents, fetchModelStatus } from '@/lib/api'
import { useTheme } from '@/lib/hooks/useTheme'
import type { Incident } from '@/types'

const incidentFallback: Incident[] = [
  { id: 'INC-01', title: 'Null reference in order handler', description: 'Order placement fails while reading missing order state.' },
  { id: 'INC-02', title: 'SQLite lock contention', description: 'Order writes are delayed and concurrent requests can time out.' },
  { id: 'INC-03', title: 'Missing payment configuration', description: 'Order handling fails when payment gateway configuration is absent.' },
  { id: 'INC-04', title: 'Memory growth per request', description: 'Order traffic retains unnecessary request state.' },
  { id: 'INC-05', title: 'Authentication failure spike', description: 'Order tokens are rejected as expired.' },
  { id: 'INC-06', title: 'Slow dependency', description: 'A simulated external payment call stalls order handling.' },
  { id: 'INC-07', title: 'Pagination boundary error', description: 'A page can omit an item at a boundary.' },
  { id: 'INC-08', title: 'Concurrent stock update', description: 'Simultaneous orders can overwrite stock updates.' },
]

const chartData = [
  { time: '10:00', errors: 2 },
  { time: '10:05', errors: 3 },
  { time: '10:10', errors: 2 },
  { time: '10:15', errors: 5 },
  { time: '10:20', errors: 4 },
  { time: '10:25', errors: 11 },
  { time: '10:30', errors: 16 },
  { time: '10:35', errors: 9 },
  { time: '10:40', errors: 5 },
]

const endpointRows = [
  { method: 'POST', path: '/api/investigations', description: 'Start an investigation' },
  { method: 'GET', path: '/api/investigations/{id}/stream', description: 'Stream investigation events (SSE)' },
  { method: 'GET', path: '/api/models/status', description: 'Check configured model services' },
  { method: 'GET', path: '/api/logs', description: 'Read and filter bundled logs' },
]

function NavigationBar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 text-text-primary no-underline" aria-label="Incident Agent V2 home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-accent">
            <Activity size={19} aria-hidden="true" />
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            Incident Agent V2
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-muted">
              v0.1-beta
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <Link className="hidden rounded-md px-3 py-2 text-sm text-text-secondary no-underline transition-colors hover:bg-surface hover:text-text-primary md:inline-flex" to="/logs">
            Log Stream
          </Link>
          <Link className="hidden rounded-md px-3 py-2 text-sm text-text-secondary no-underline transition-colors hover:bg-surface hover:text-text-primary md:inline-flex" to="/history">
            Incidents
          </Link>
          <Link className="hidden rounded-md px-3 py-2 text-sm text-text-secondary no-underline transition-colors hover:bg-surface hover:text-text-primary md:inline-flex" to="/evaluation">
            Benchmark
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:text-text-primary"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <Link
            to="/investigate"
            className="ml-1 inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent-hover sm:px-4"
          >
            <span>Launch Console</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  )
}

function ConsolePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background-raised shadow-sm dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Investigation console</p>
          <p className="mt-0.5 text-xs text-text-muted">Illustrative interface preview · not live output</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-status-warning" />
          Sample · INC-07
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="min-w-0 border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Log sample</h3>
            <span className="font-mono text-xs text-text-muted">sample_app.jsonl</span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            <div className="grid grid-cols-[52px_48px_1fr] gap-2 rounded-md bg-surface px-2.5 py-2">
              <span className="text-text-muted">10:24:11</span>
              <span className="text-status-info">INFO</span>
              <span className="truncate text-text-secondary">Request received: GET /orders?page=4</span>
            </div>
            <div className="grid grid-cols-[52px_48px_1fr] gap-2 rounded-md bg-status-warning-bg px-2.5 py-2">
              <span className="text-text-muted">10:24:12</span>
              <span className="text-status-warning">WARN</span>
              <span className="truncate text-text-secondary">Pagination returned an unexpected item count</span>
            </div>
            <div className="grid grid-cols-[52px_48px_1fr] gap-2 rounded-md bg-status-error-bg px-2.5 py-2">
              <span className="text-text-muted">10:24:12</span>
              <span className="text-status-error">ERROR</span>
              <span className="truncate text-text-secondary">Order page boundary check failed</span>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Error count · example</h3>
              <span className="text-xs text-text-muted">Illustrative</span>
            </div>
            <div className="h-32 w-full" role="img" aria-label="Illustrative error count chart with a spike around 10:30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="landing-error-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'hsl(var(--text-muted))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--text-muted))', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--bg-raised))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--text-primary))',
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="errors" name="Errors" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#landing-error-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Agent event preview</h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                <Search size={12} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Review supplied evidence</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-muted">Inspect the selected incident logs and identify related signals.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                <GitBranch size={12} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Search source and Git history</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-muted">Optional repository tools provide context for the diagnosis.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-success-bg text-status-success">
                <ShieldCheck size={12} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">Return evidence and a suggested fix</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-muted">Review the findings before making any code changes.</p>
              </div>
            </li>
          </ol>
          <div className="mt-5 rounded-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-text-primary">Diagnosis preview</p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              The selected sample describes a pagination boundary error. This preview is illustrative and does not represent a completed analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8">
        <div>
          <div className="mb-6 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>Incident reasoning engine</span>
            <span className="text-text-muted">·</span>
            <span>Gemini Flash + FAISS RAG</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            Diagnose production failures{' '}
            <span className="text-accent">before customers notice.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
            Cluster related telemetry, correlate stack traces with repository and Git context, and get an evidence-backed diagnosis with actionable next steps.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/investigate"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent-hover"
            >
              Launch Autonomous Investigator
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/logs"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-text-primary no-underline transition-colors hover:bg-surface-hover"
            >
              <Terminal size={16} aria-hidden="true" />
              Inspect Log Stream
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-status-success" /> Evidence references</span>
            <span className="inline-flex items-center gap-1.5"><Search size={14} className="text-accent" /> Source and Git search</span>
            <span className="inline-flex items-center gap-1.5"><Activity size={14} className="text-accent" /> HDFS-only anomaly model</span>
          </div>
        </div>
        <ConsolePreview />
      </div>
    </section>
  )
}

function ArchitectureGrid() {
  const capabilities = [
    {
      icon: Brain,
      eyebrow: 'Reasoning',
      title: 'Google Gemini Flash',
      description: 'A tool-calling investigation flow uses Gemini when configured, with a local diagnostic fallback when cloud reasoning is unavailable.',
      detail: 'Findings include evidence references for review.',
    },
    {
      icon: Database,
      eyebrow: 'Retrieval',
      title: 'FAISS documentation RAG',
      description: 'An in-memory FAISS index retrieves from TF-IDF vectors built from the project README and incident catalog.',
      detail: 'Local index; no claim of production runbook coverage.',
    },
    {
      icon: GitBranch,
      eyebrow: 'Repository context',
      title: 'Git and source forensics',
      description: 'Optional tools can search source text, read bounded file ranges, and inspect Git history or commit diffs.',
      detail: 'AST call-graph traversal is not implemented.',
    },
    {
      icon: Cpu,
      eyebrow: 'Anomaly signals',
      title: 'Log classification',
      description: 'The local Drain3 / Random Forest detector is trained for HDFS block-session logs. An external ranking service is optional.',
      detail: 'Other log formats are outside the local detector scope.',
    },
  ]

  return (
    <section className="border-y border-border bg-surface/40 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Core architecture & intelligence</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Tools that support a reviewable diagnosis.</h2>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            The capabilities below describe what the current application implements, including their boundaries.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {capabilities.map((capability) => {
            const Icon = capability.icon
            return (
              <article key={capability.title} className="rounded-xl border border-border bg-background-raised p-5 shadow-sm dark:shadow-none sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-accent">
                  <Icon size={19} aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-medium uppercase tracking-wide text-text-muted">{capability.eyebrow}</p>
                <h3 className="mt-1 text-lg font-semibold text-text-primary">{capability.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{capability.description}</p>
                <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">{capability.detail}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function IncidentSandbox() {
  const [selectedIncidentId, setSelectedIncidentId] = useState('INC-07')
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const { data: incidentData, isError: incidentsUnavailable } = useQuery({
    queryKey: ['landingIncidents'],
    queryFn: fetchIncidents,
    staleTime: 60_000,
  })
  const { data: modelStatus, isPending: checkingStatus, isError: statusUnavailable } = useQuery({
    queryKey: ['modelStatus'],
    queryFn: fetchModelStatus,
    refetchInterval: 30_000,
  })

  const incidents = incidentData?.length ? incidentData : incidentFallback
  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0]
  const command = `python -m sample_app.traffic --url http://127.0.0.1:8001 --incident ${selectedIncident.id}`

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  const apiStatus = checkingStatus
    ? 'Checking API'
    : statusUnavailable
      ? 'API unavailable'
      : modelStatus
        ? 'API connected'
        : 'API unavailable'

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Incident simulation sandbox</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Explore a reproducible failure mode.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
              Select one of the sample app’s eight incident modes to update the local traffic command. Start the sample API separately before running it.
            </p>

            <label htmlFor="incident-select" className="mt-7 block text-sm font-medium text-text-primary">Incident scenario</label>
            <select
              id="incident-select"
              value={selectedIncident.id}
              onChange={(event) => {
                setSelectedIncidentId(event.target.value)
                setCopyState('idle')
              }}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
            >
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>{incident.id} · {incident.title}</option>
              ))}
            </select>
            <p className="mt-2 min-h-5 text-sm text-text-muted">{selectedIncident.description}</p>
            {incidentsUnavailable && (
              <p className="mt-1 text-xs text-text-muted">The API is unavailable; using the bundled incident catalog.</p>
            )}

            <div className="terminal-surface mt-5 overflow-hidden rounded-lg">
              <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-xs text-slate-300"><Terminal size={14} /> PowerShell / terminal</span>
                <button
                  type="button"
                  onClick={copyCommand}
                  className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  {copyState === 'copied' ? <Check size={13} /> : <Clipboard size={13} />}
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code className="block overflow-x-auto px-4 py-4 font-mono text-xs leading-6 text-slate-100 sm:text-sm">{command}</code>
            </div>
            {copyState === 'error' && (
              <p role="status" className="mt-2 text-xs text-status-warning">Could not access the clipboard. Select and copy the command above.</p>
            )}
            {copyState === 'copied' && <p role="status" className="mt-2 text-xs text-status-success">Command copied to clipboard.</p>}

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                modelStatus
                  ? 'border-status-success-border bg-status-success-bg text-status-success'
                  : statusUnavailable
                    ? 'border-status-warning-border bg-status-warning-bg text-status-warning'
                    : 'border-border bg-surface text-text-muted'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {apiStatus}
              </span>
              {modelStatus && <span className="text-text-muted">{modelStatus.active_provider} · {modelStatus.active_model}</span>}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background-raised shadow-sm dark:shadow-none">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-text-primary">Available API endpoints</h3>
              <p className="mt-1 text-xs text-text-muted">Backend routes used by the current application</p>
            </div>
            <div className="divide-y divide-border">
              {endpointRows.map((endpoint) => (
                <div key={endpoint.path} className="grid gap-1 px-5 py-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-3">
                  <span className={`font-mono text-[10px] font-semibold ${
                    endpoint.method === 'POST' ? 'text-status-warning' : 'text-status-success'
                  }`}>{endpoint.method}</span>
                  <div className="min-w-0">
                    <code className="break-all font-mono text-xs text-text-primary">{endpoint.path}</code>
                    <p className="mt-1 text-xs text-text-muted">{endpoint.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border bg-surface/50 px-5 py-3 text-xs text-text-muted">
              The log viewer reads bundled sample logs; this is not live telemetry ingestion.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="text-sm font-semibold text-text-primary">Incident Agent V2</p>
          <p className="mt-1 text-xs text-text-muted">Evidence-backed incident investigation and log analysis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['FastAPI', 'React 18', 'Gemini Flash'].map((technology) => (
            <span key={technology} className="rounded-full border border-border bg-background-raised px-2.5 py-1 text-xs text-text-secondary">
              {technology}
            </span>
          ))}
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Footer navigation">
          <Link to="/logs" className="text-text-secondary no-underline hover:text-text-primary">Log Stream</Link>
          <Link to="/history" className="text-text-secondary no-underline hover:text-text-primary">Incidents</Link>
          <Link to="/evaluation" className="text-text-secondary no-underline hover:text-text-primary">Benchmark</Link>
          <Link to="/investigate" className="text-text-secondary no-underline hover:text-text-primary">Console</Link>
        </nav>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-text-primary">
      <NavigationBar />
      <main>
        <HeroSection />
        <ArchitectureGrid />
        <IncidentSandbox />
      </main>
      <SiteFooter />
    </div>
  )
}
