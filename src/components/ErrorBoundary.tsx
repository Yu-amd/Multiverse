import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to localStorage for debugging (optional)
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        componentStack: errorInfo.componentStack
      };
      
      // Store last 10 errors
      const existingLogs = localStorage.getItem('errorLogs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.unshift(errorLog);
      logs.splice(10); // Keep only last 10 errors
      localStorage.setItem('errorLogs', JSON.stringify(logs));
    } catch (e) {
      // Silently fail if localStorage is not available
      console.warn('Failed to log error to localStorage:', e);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '40px',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--metric-bg)',
            border: '2px solid var(--error-color)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '20px'
            }}>
              ⚠️
            </div>
            <h2 style={{
              color: 'var(--error-color)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '15px'
            }}>
              Something went wrong
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              An unexpected error occurred. Don't worry, your data is safe. You can try refreshing the page or clicking the button below to reset this component.
            </p>
            
            {this.state.error && (
              <details style={{
                marginBottom: '20px',
                textAlign: 'left',
                background: 'var(--bg-secondary)',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  marginBottom: '10px',
                  fontWeight: 500
                }}>
                  Error Details
                </summary>
                <div style={{
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  color: 'var(--error-color)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre style={{
                        marginTop: '5px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        overflow: 'auto',
                        maxHeight: '200px'
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--accent-color)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--accent-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)';
                }}
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'var(--button-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--button-hover)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--button-bg)';
                }}
              >
                🔃 Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

