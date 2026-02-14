import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logRendererEvent } from '../lib/diagnostics'

interface Props {
  children: ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, info.componentStack)
    logRendererEvent('error', 'renderer.react_error_boundary', {
      label: this.props.fallbackLabel ?? 'Component',
      message: error.message,
      stack: error.stack ?? null,
      componentStack: info.componentStack,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 16,
          color: '#f87171',
          background: 'rgba(248, 113, 113, 0.05)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
          overflow: 'auto',
          maxHeight: '100%',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            {this.props.fallbackLabel ?? 'Component'} crashed
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#9A9692' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#595653', fontSize: 10, marginTop: 8 }}>
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
