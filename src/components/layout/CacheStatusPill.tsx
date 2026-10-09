import { Link } from "react-router-dom";
import { useModelStore } from "../../stores/modelStore.ts";

export default function CacheStatusPill() {
  const fieldId = useModelStore((s) => s.fieldId);
  const label =
    fieldId.status === "ready"
      ? "ID ready"
      : fieldId.status === "loading"
        ? `Loading ${fieldId.progressPct}%`
        : fieldId.status === "error"
          ? "ID unavailable"
          : "ID not set up";
  const color =
    fieldId.status === "ready"
      ? "bg-(--color-edible-bg) text-(--color-edible)"
      : fieldId.status === "loading"
        ? "bg-(--color-caution-bg) text-(--color-caution)"
        : fieldId.status === "error"
          ? "bg-(--color-danger-bg) text-(--color-danger)"
          : "bg-black/10 text-(--color-unknown)";
  return (
    <Link
      to="/models"
      aria-label={`Offline identification status: ${label}. Manage models.`}
      className={`inline-flex min-h-12 items-center rounded-full px-3 text-base font-semibold ${color}`}
    >
      <span aria-hidden className="mr-1 inline-block h-3 w-3 rounded-full bg-current" />
      {label}
    </Link>
  );
}
