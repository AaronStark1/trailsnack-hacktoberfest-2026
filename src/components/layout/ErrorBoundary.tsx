import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl p-6" role="alert">
          <h1 className="text-3xl font-bold">Something went wrong on the trail</h1>
          <p className="mt-3">
            TrailSnack hit an unexpected error. Your saved field log is stored on this device
            and is safe. Reload to continue — and never eat anything based on a half-loaded
            result.
          </p>
          <p className="mt-2 text-base opacity-70">{this.state.error.message}</p>
          <button
            className="mt-4 min-h-14 rounded-xl bg-(--color-trail) px-5 text-lg font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Reload the app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
