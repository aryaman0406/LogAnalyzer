import { Suspense, lazy, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Search,
  Bot,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  Zap,
  Terminal,
  Sun,
  Moon,
  CheckCircle2,
  GitBranch,
  Layers,
  Database,
  Cpu,
  Flame,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { HeroFallback } from '@/components/three/HeroFallback'
import { useTheme } from '@/lib/hooks/useTheme'
import { Badge } from '@/components/ui/Badge'

const HeroScene = lazy(() => import('@/components/three/HeroScene'))

const steps = [
  {
    icon: Search,
    step: 'STEP 01',
    title: 'Autonomous Log Ingestion',
    desc: 'Ingests real-time distributed telemetry, system traces, and cluster logs with sub-millisecond Drain3 clustering.',
    tag: 'Drain3 Clustering',
  },
  {
    icon: Bot,
    step: 'STEP 02',
    title: 'Multi-Tool AST & Git Reasoning',
    desc: 'The reasoning agent inspects AST trees, correlates commit diffs, and isolates anomalous call stacks.',
    tag: 'Tree-sitter & Git diff',
  },
  {
    icon: FileCheck2,
    step: 'STEP 03',
    title: 'Root Cause & Verified Patch',
    desc: 'Delivers a confidence-scored diagnostic report with strict evidence citations and ready-to-merge patches.',
    tag: 'Zero-hallucination PR',
  },
]

const capabilities = [
  {
    icon: ShieldCheck,
    title: 'Zero Hallucination Guard',
    desc: 'Every root cause claim requires a verified file path, line number, and log timestamp citation.',
    badge: 'Integrity First',
  },
  {
    icon: Cpu,
    title: 'Deep Code Graph Analysis',
    desc: 'Parses Python & TypeScript ASTs to traverse caller-callee graphs directly down to exception origins.',
    badge: 'AST Traversal',
  },
  {
    icon: Flame,
    title: 'Anomaly & Surge Isolation',
    desc: 'Filters out normal heartbeat noise to highlight sudden error bursts and cascading microservice failures.',
    badge: 'Real-time',
  },
  {
    icon: GitBranch,
    title: 'Automated Git Diff Correlation',
    desc: 'Pins down the exact commit and line addition responsible for regression without manual bisecting.',
    badge: 'Git bisect AI',
  },
]

const mockLogs = [
  { time: '14:32:01.412', level: 'INFO', svc: 'auth-svc', msg: 'Token validation pool healthy (24/24 workers)' },
  { time: '14:32:02.109', level: 'WARN', svc: 'payment-gw', msg: 'Upstream gateway latency 420ms exceeds target 150ms' },
  { time: '14:32:02.845', level: 'ERROR', svc: 'billing-api', msg: 'StripeConnectionError: idempotency key collision #e98a1f' },
  { time: '14:32:03.002', level: 'AGENT', svc: 'incident-ai', msg: 'Root cause identified in services/billing/stripe.ts:84' },
]

export function LandingPage() {
  const reducedMotion = useReducedMotion()
  const { theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'preview' | 'diff'>('preview')

  return (
    <div className="min-h-screen bg-bg-base text-text-primary relative overflow-x-hidden selection:bg-accent/30 selection:text-white font-sans antialiased">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-15%] left-[20%] w-[550px] h-[550px] rounded-full bg-accent/15 blur-[120px] mix-blend-screen" />
        <div className="absolute top-[10%] right-[15%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[130px] mix-blend-screen" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-bg-base/80 border-b border-border/60 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 h-16">
          <Link to="/" className="flex items-center gap-3 no-underline group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(129,140,248,0.25)] group-hover:scale-105 group-hover:border-accent transition-all">
              <Activity size={19} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-text-primary flex items-center gap-2">
                Incident Agent
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-accent/15 text-accent border border-accent/25">
                  v0.1-beta
                </span>
              </span>
              <span className="text-[11px] text-text-muted hidden sm:inline">Autonomous Reliability Platform</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/logs"
              className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex"
            >
              Log Stream
            </Link>
            <Link
              to="/history"
              className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex"
            >
              Incidents
            </Link>
            <Link
              to="/evaluation"
              className="text-xs font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex"
            >
              Benchmark
            </Link>

            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface hover:text-text-primary transition-all border border-border/70 bg-surface/40 cursor-pointer shadow-sm"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/investigate"
              className="h-9 px-4 rounded-xl bg-accent hover:bg-accent-hover text-bg-base text-xs font-bold flex items-center gap-2 no-underline transition-all shadow-[0_0_20px_rgba(129,140,248,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Console</span>
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-6 pt-12 pb-20 text-center">
        {/* 3D Scene / Ambient Visuals */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {reducedMotion ? (
            <HeroFallback />
          ) : (
            <Suspense fallback={<HeroFallback />}>
              <HeroScene />
            </Suspense>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/75 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-7">
          {/* Announcement Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-md shadow-[0_0_25px_rgba(129,140,248,0.15)]"
          >
            <Sparkles size={14} className="text-accent animate-pulse" />
            <span className="text-xs font-medium text-accent">Autonomous Incident Reasoning Agent</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
            <span className="text-xs text-text-secondary font-mono">Zero Hallucinations</span>
          </motion.div>

          {/* Hero Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-text-primary leading-[1.08]"
          >
            Diagnose production failures{' '}
            <span className="bg-gradient-to-r from-accent via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              before customers notice.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-normal"
          >
            An autonomous agent that clusters noisy telemetry, correlates stack traces with git commits, and isolates exact root causes with actionable code diffs.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <Link
              to="/investigate"
              className="inline-flex items-center gap-2.5 h-12 px-7 rounded-xl bg-accent text-bg-base font-bold text-sm no-underline hover:bg-accent-hover transition-all shadow-[0_0_30px_rgba(129,140,248,0.45)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Launch Autonomous Investigator</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/logs"
              className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl bg-surface/70 hover:bg-surface border border-border hover:border-accent/40 text-sm font-semibold text-text-primary no-underline transition-all shadow-sm"
            >
              <Terminal size={16} className="text-text-muted" />
              <span>Inspect Live Log Stream</span>
            </Link>
          </motion.div>

          {/* Verified Capabilities Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-text-muted font-mono"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span className="text-text-secondary font-semibold">Strict Evidence Citation</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <span className="text-text-secondary font-semibold">Sub-second AST Traversal</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              <span className="text-text-secondary font-semibold">Drain3 Template Clustering</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Agent Terminal & Root Cause Preview */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-8 space-y-2">
          <Badge variant="accent" dot pulse>
            AGENT COGNITION PREVIEW
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Autonomous diagnosis in action
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-lg mx-auto">
            Witness how telemetry is ingested, correlated against repository ASTs, and resolved with cited patches.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-border/80 bg-surface/60 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* Window Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-bg-raised/70">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-mono text-text-muted">incident-agent://investigator/session-8921</span>
            </div>

            <div className="flex items-center gap-1 bg-bg-base/80 p-0.5 rounded-lg border border-border/60">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeTab === 'preview' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Telemetry Stream
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  activeTab === 'diff' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                Synthesized Fix Diff
              </button>
            </div>
          </div>

          {/* Terminal / Code Body */}
          <div className="p-5 font-mono text-xs overflow-x-auto min-h-[220px]">
            {activeTab === 'preview' ? (
              <div className="space-y-3">
                {mockLogs.map((log, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-1.5 border-b border-border/30 last:border-none">
                    <span className="text-text-muted text-[11px] shrink-0">{log.time}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit shrink-0 ${
                        log.level === 'ERROR'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : log.level === 'WARN'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : log.level === 'AGENT'
                          ? 'bg-accent/20 text-accent border border-accent/30 font-semibold'
                          : 'bg-surface text-text-secondary border border-border/40'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-accent/90 shrink-0 font-medium">{log.svc}</span>
                    <span className={`text-text-secondary ${log.level === 'AGENT' ? 'text-text-primary font-semibold' : ''}`}>
                      {log.msg}
                    </span>
                  </div>
                ))}
                <div className="mt-4 p-3.5 rounded-xl bg-accent/10 border border-accent/20 flex items-start gap-3 text-xs">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-text-primary">
                      Root Cause Isolated (Confidence: 98.4%)
                    </div>
                    <div className="text-text-secondary text-[11px]">
                      Race condition detected in Stripe idempotent key caching mechanism. Culprit commit{' '}
                      <span className="text-accent underline cursor-pointer">fe891a2</span> modified transaction lock TTL.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <div className="text-text-muted pb-2">--- a/services/billing/stripe.ts</div>
                <div className="text-text-muted pb-3">+++ b/services/billing/stripe.ts</div>
                <div className="text-text-muted">{'@@ -82,6 +82,7 @@ async function createCharge(...) {'}</div>
                <div className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded-sm border-l-2 border-rose-500">
                  {'- const cacheKey = `idemp:${req.id}`'}
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-sm border-l-2 border-emerald-500">
                  {'+ const cacheKey = `idemp:${req.workspaceId}:${req.id}`'}
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-sm border-l-2 border-emerald-500">
                  {'+ await redis.expire(cacheKey, 86400)'}
                </div>
                <div className="text-text-muted pt-2">{'  return await stripeClient.charges.create(...)'}</div>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      {/* 3-Step Systematic Pipeline */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14 space-y-2">
          <Badge variant="accent" dot pulse>
            SYSTEM ARCHITECTURE
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            From raw log noise to verified resolution
          </h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            A deterministic multi-agent investigation workflow engineered for precision and traceability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-card rounded-2xl p-7 relative group hover:border-accent/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent group-hover:scale-110 group-hover:bg-accent/20 transition-all">
                    <step.icon size={22} />
                  </div>
                  <span className="text-xs font-mono font-bold text-accent px-2 py-1 rounded bg-accent/10 border border-accent/20">
                    {step.step}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-text-primary tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-normal">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>{step.tag}</span>
                <ChevronRight size={14} className="text-accent group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14 space-y-2">
          <Badge variant="accent" dot>
            ENTERPRISE CAPABILITIES
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Engineered for high-throughput reliability
          </h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            Autonomous tooling designed to eliminate developer fatigue and reduce MTTR by up to 85%.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="p-6 rounded-2xl bg-surface/40 border border-border/70 hover:border-accent/40 hover:bg-surface/70 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                  <item.icon size={19} />
                </div>
                <h3 className="text-sm font-bold text-text-primary">{item.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40">
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-surface border border-border/80 text-text-muted">
                  {item.badge}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-accent/30 bg-gradient-to-b from-accent/15 via-surface/60 to-bg-raised/80 backdrop-blur-xl text-center space-y-6">
          <div className="absolute inset-0 bg-radial from-accent/20 to-transparent pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Ready to streamline your incident triage?
          </h2>
          <p className="text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            Start investigating your logs in seconds with real-time anomaly detection, interactive timelines, and automatic patch generation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/investigate"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-accent hover:bg-accent-hover text-bg-base font-bold text-sm no-underline shadow-[0_0_30px_rgba(129,140,248,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Open Investigation Console</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/logs"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-surface/80 hover:bg-surface border border-border text-sm font-semibold text-text-primary no-underline transition-all"
            >
              <Database size={16} className="text-text-muted" />
              <span>Browse Ingested Logs</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/80 py-10 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-text-muted">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
            <Activity size={14} />
          </div>
          <span className="font-semibold text-text-primary">Incident Agent</span>
          <span>•</span>
          <span>Autonomous Enterprise Reliability</span>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px]">
          <span className="flex items-center gap-2">
            <span className="pulse-dot bg-emerald-400" />
            <span className="text-emerald-400 font-semibold">CLUSTER NOMINAL</span>
          </span>
          <span className="text-border">|</span>
          <Link to="/evaluation" className="hover:text-text-primary transition-colors no-underline">
            Benchmarks
          </Link>
          <Link to="/model" className="hover:text-text-primary transition-colors no-underline">
            Architecture
          </Link>
        </div>
      </footer>
    </div>
  )
}
export default LandingPage
