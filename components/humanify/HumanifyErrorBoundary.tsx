/**
 * Humanify-branded error boundary — deep-link to observability for platform ops.
 */
import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
  title?: string;
};

type State = { hasError: boolean; message?: string };

export default class HumanifyErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[HumanifyErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            {this.props.title || 'Halaman bermasalah'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {this.state.message || 'Terjadi kesalahan tak terduga.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Jika berulang, buka Observability atau hubungi ops dengan screenshot.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: undefined })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </button>
            <a
              href="/platform/observability"
              className="rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Observability
            </a>
          </div>
        </div>
      </div>
    );
  }
}
