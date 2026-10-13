import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CanvasErrorBoundary] Uncaught visual error:', error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none">
          <div className="mb-3 rounded-full border border-rose-300 bg-rose-50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/40">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="font-editorial text-base font-semibold text-stone-800 dark:text-stone-200">
            {this.props.fallbackTitle || 'Error al renderizar la visualización'}
          </h3>
          <p className="mt-1 max-w-md font-mono text-xs text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/40 break-words">
            {this.state.error?.message || 'Error inesperado en el lienzo visual.'}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 font-mono text-xs text-stone-700 shadow-2xs hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reintentar Renderizado</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
