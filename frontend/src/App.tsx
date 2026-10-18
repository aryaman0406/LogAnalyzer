import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import { LandingPage } from '@/pages/LandingPage'
import { InvestigatePage } from '@/pages/InvestigatePage'
import { LogsPage } from '@/pages/LogsPage'
import { CodePage } from '@/pages/CodePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { EvaluationPage } from '@/pages/EvaluationPage'
import { ModelPage } from '@/pages/ModelPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            {/* Landing page with 3D hero (no sidebar) */}
            <Route path="/" element={<LandingPage />} />

            {/* App shell routes (with Sidebar, TopBar, and transitions) */}
            <Route element={<AppLayout />}>
              <Route path="/investigate" element={<InvestigatePage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/code" element={<CodePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/evaluation" element={<EvaluationPage />} />
              <Route path="/model" element={<ModelPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/investigate" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
