import { useEffect, useState } from "react";

/** What the browser reports for location access; "unknown" when it will not say. */
export type GeoPermission = "granted" | "denied" | "prompt" | "unknown";

/**
 * Live geolocation permission from the Permissions API. Read-only: it never
 * requests a fix or triggers a permission prompt, and it reports "unknown"
 * rather than guessing where the API is missing (e.g. older Safari).
 */
export function useGeoPermission(): GeoPermission {
  const [state, setState] = useState<GeoPermission>("unknown");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    let status: PermissionStatus | null = null;
    const sync = () => {
      if (!cancelled && status) setState(status.state);
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (cancelled) return;
        status = result;
        sync();
        result.addEventListener("change", sync);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      status?.removeEventListener("change", sync);
    };
  }, []);

  return state;
}
