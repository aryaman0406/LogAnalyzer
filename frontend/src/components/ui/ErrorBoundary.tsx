import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center text-error mb-3">
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Something went wrong
          </h3>
          <p className="text-xs text-text-muted max-w-[280px]">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
