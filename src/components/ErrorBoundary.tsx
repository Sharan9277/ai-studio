import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{
            color: '#ff6b6b',
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            ⚠️ Something went wrong
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}>
            The AI Studio encountered an unexpected error. Please refresh the page and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              marginTop: '2rem', 
              textAlign: 'left',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <summary style={{ cursor: 'pointer', color: '#ff6b6b' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{ 
                marginTop: '1rem', 
                color: 'rgba(255, 255, 255, 0.8)',
                whiteSpace: 'pre-wrap',
                overflow: 'auto'
              }}>
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;