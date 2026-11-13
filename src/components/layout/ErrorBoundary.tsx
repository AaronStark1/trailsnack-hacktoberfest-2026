import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto w-full max-w-3xl p-4 pt-6" role="alert">
          <div className="tac-card overflow-hidden p-0">
            <div aria-hidden className="hazard-stripes h-3" />
            <div className="p-5 sm:p-6">
              <p className="mono-label text-danger">System · Unhandled exception</p>
              <p className="display-caps mt-2 text-5xl text-danger">Fault</p>
              <h1 className="mt-2 text-2xl font-extrabold text-ink">Something went wrong on the trail</h1>
              <p className="mt-3 text-ink">
                TrailSnack hit an unexpected error. Your saved field log is stored on this device
                and is safe. Reload to continue — and never eat anything based on a half-loaded
                result.
              </p>
              <p className="well mono-value mt-4 rounded-tac px-3 py-2 text-sm break-words text-ink-muted">
                {this.state.error.message}
              </p>
              <button
                className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-tac border border-trail-dark/60 bg-trail px-5 text-lg font-bold tracking-tight text-on-trail select-none bevel tac-press hover:bg-trail-dark sm:w-auto"
                onClick={() => window.location.reload()}
              >
                Reload the app
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
