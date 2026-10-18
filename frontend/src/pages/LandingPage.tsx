import { Suspense, lazy } from 'react'
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
} from 'lucide-react'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { HeroFallback } from '@/components/three/HeroFallback'
import { useTheme } from '@/lib/hooks/useTheme'
import { Badge } from '@/components/ui/Badge'

const HeroScene = lazy(() => import('@/components/three/HeroScene'))

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Autonomous Ingestion',
    desc: 'Ingests real-time distributed logs, exception stack traces, and system telemetry across your cluster.',
  },
  {
    icon: Bot,
    number: '02',
    title: 'Multi-Tool Reasoning',
    desc: 'Agent iteratively inspects repository ASTs, checks git diff histories, and queries ML anomaly detectors.',
  },
  {
    icon: FileCheck2,
    number: '03',
    title: 'Root Cause & Patch',
    desc: 'Generates a confidence-scored diagnostic report with cited evidence and ready-to-apply pull requests.',
  },
]

export function LandingPage() {
  const reducedMotion = useReducedMotion()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-bg-base text-text-primary relative overflow-x-hidden selection:bg-accent/30 selection:text-white">
      {/* Top Navbar */}
      <nav className="relative z-30 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto max-sm:px-4">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/40 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(129,140,248,0.3)] group-hover:scale-105 transition-transform">
            <Activity size={18} />
          </div>
          <span className="text-sm font-bold tracking-tight text-text-primary">
            Incident Agent <span className="text-text-muted font-mono text-[11px] font-normal">v0.1</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors border border-border/50 bg-surface/30 cursor-pointer"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link
            to="/investigate"
            className="h-8 px-4 rounded-lg bg-surface hover:bg-surface-hover border border-border/80 text-xs font-semibold text-text-primary flex items-center gap-2 no-underline transition-all shadow-sm"
          >
            <span>Open Console</span>
            <ArrowRight size={13} className="text-text-muted" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-[75vh] px-6 text-center pt-8 pb-16">
        {/* 3D Scene / Ambient Visuals */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {reducedMotion ? (
            <HeroFallback />
          ) : (
            <Suspense fallback={<HeroFallback />}>
              <HeroScene />
            </Suspense>
          )}
          {/* Subtle vignette & fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/70 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          {/* Pill announcement badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-[11px] font-mono text-accent backdrop-blur-md shadow-[0_0_20px_rgba(129,140,248,0.2)]"
          >
            <Sparkles size={13} className="animate-pulse text-accent" />
            <span>Autonomous Incident Intelligence</span>
            <span className="w-1 h-1 rounded-full bg-accent/50" />
            <span className="text-text-secondary">Zero Configuration</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.1]"
          >
            Debug production failures{' '}
            <span className="bg-gradient-to-r from-accent via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              in seconds.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed"
          >
            An autonomous agent that inspects structured logs, queries git history, and isolates root causes with verified citations and actionable patches.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Link
              to="/investigate"
              className="inline-flex items-center gap-2.5 h-11 px-6 rounded-xl bg-accent text-bg-base font-bold text-xs no-underline hover:bg-accent-hover transition-all shadow-[0_0_25px_rgba(129,140,248,0.4)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Live Investigation</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/logs"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-surface/60 hover:bg-surface border border-border text-xs font-semibold text-text-primary no-underline transition-colors"
            >
              <Terminal size={14} className="text-text-muted" />
              <span>Explore Log Stream</span>
            </Link>
          </motion.div>

          {/* Micro stats banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="pt-6 flex items-center justify-center gap-6 text-[11px] text-text-muted font-mono"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Hallucination Guard</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>Sub-second Traversal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-accent" />
              <span>Drain3 Log Clustering</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* 3-Step Feature Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24 max-sm:px-4">
        <div className="text-center mb-12 space-y-2">
          <Badge variant="accent" dot pulse>
            WORKFLOW PIPELINE
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            From noise to verified root cause
          </h2>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Deterministic step-by-step reasoning cycle designed for mission-critical reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-card rounded-2xl p-6 relative group hover:border-accent/40 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <step.icon size={20} />
                </div>
                <span className="text-[11px] font-mono text-text-muted font-bold">
                  {step.number}
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-text-primary tracking-tight">
                  {step.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-normal">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/80 py-8 px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted max-sm:px-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">Incident Agent</span>
          <span>•</span>
          <span>Enterprise Reliability Platform</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="pulse-dot bg-emerald-400" />
            <span className="text-emerald-400">CLUSTER NOMINAL</span>
          </span>
          <span>SQLite + FastAPI</span>
        </div>
      </footer>
    </div>
  )
}
export default LandingPage
