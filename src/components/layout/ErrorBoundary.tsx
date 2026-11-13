import { Component, type ReactNode } from "react";
import { buttonClass } from "../ui/Button.tsx";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="forest-floor flex min-h-dvh items-start justify-center p-4 pt-10 sm:items-center sm:pt-4" role="alert">
          <div className="plate w-full max-w-xl overflow-hidden border-danger/50">
            <div aria-hidden className="thorn-edge text-danger" />
            <div className="p-6 sm:p-8">
              <p className="mono-label text-danger-ink">Unhandled error</p>
              <h1 className="display mt-3 text-display-lg text-ink">Something went wrong on the trail</h1>
              <p className="mt-4 text-ink-muted">
                TrailSnack hit an unexpected error. Your saved field log is stored on this device
                and is safe. Reload to continue — and never eat anything based on a half-loaded
                result.
              </p>
              <p className="well mono-value mt-5 rounded-field px-4 py-3 text-sm break-words text-ink-muted">
                {this.state.error.message}
              </p>
              <button
                type="button"
                className={`${buttonClass("primary")} mt-6 w-full sm:w-auto`}
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
