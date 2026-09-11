import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Richbecks app error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] p-6">
          <div className="bg-white rounded-xl shadow-card p-8 max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} />
            </div>
            <h2 className="font-display font-bold text-charcoal text-lg mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-5">
              This screen hit an unexpected error. Your data is safe — try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gold hover:bg-gold-dark text-charcoal font-semibold rounded-lg px-5 py-2.5 text-sm"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
