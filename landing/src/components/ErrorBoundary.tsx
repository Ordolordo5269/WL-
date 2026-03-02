import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold mb-4 text-red-500">Something went wrong</h1>
          <p className="text-gray-400 mb-6 max-w-md text-center">
            The application encountered an unexpected error. Please try reloading the page.
          </p>
          <button
            className="px-6 py-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-8 p-4 bg-gray-900 rounded text-xs text-red-300 overflow-auto max-w-full">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
