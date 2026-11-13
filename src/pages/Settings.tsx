import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Flame, House, Microscope, Satellite, Sun } from "lucide-react";
import { buttonClass } from "../components/ui/Button.tsx";
import Toggle from "../components/ui/Toggle.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import HotlineCard from "../components/settings/HotlineCard.tsx";
import HomeLink from "../components/layout/HomeLink.tsx";
import { useGeoPermission, type GeoPermission } from "../components/layout/useGeoPermission.ts";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { loadDatabase } from "../engine/loadDatabase.ts";
import type { FloraDB } from "../engine/types.ts";
import sourcesRaw from "../../docs/SOURCES.md?raw";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "india", "global"];

const REGION_LABELS: Record<string, string> = {
  "north-america": "North America",
  "uk-ireland": "UK & Ireland",
  europe: "Europe",
  "australia-nz": "Australia & NZ",
  india: "India",
  global: "Global",
};

/** What the browser reports about location access, in plain words. Only shown while tagging is on. */
const GPS_HINTS: Record<GeoPermission, { text: string; ink: string }> = {
  granted: { text: "Location allowed in this browser", ink: "text-glow" },
  denied: { text: "Location is blocked in this browser — entries save without a fix", ink: "text-danger-ink" },
  prompt: { text: "The browser will ask for location when you add a fix", ink: "text-amber" },
  unknown: { text: "Permission state not reported by this browser", ink: "text-ink-faint" },
};

export default function Settings() {
  const s = useSettingsStore();
  const geoPermission = useGeoPermission();
  const [dbVersion, setDbVersion] = useState("…");
  const [db, setDb] = useState<FloraDB | null>(null);
  const [dbFailed, setDbFailed] = useState(false);
  useEffect(() => {
    void loadDatabase()
      .then((loaded) => {
        setDb(loaded);
        setDbVersion(loaded.version);
      })
      .catch(() => {
        setDbFailed(true);
        setDbVersion("bundled (offline)");
      });
  }, []);

  const gpsHint = GPS_HINTS[geoPermission];

  return (
    <section aria-labelledby="settings-h" className="grid gap-8">
      <SectionHeader
        as="h1"
        id="settings-h"
        eyebrow="05 · Settings"
        title="Settings"
        lede="Tune the instrument for your region, your device and the light you are walking in. Everything is stored on this device."
      />

      <section aria-labelledby="locale-h" className="plate p-5 sm:p-6">
        <SectionHeader id="locale-h" as="h2" eyebrow="Locale & compute" title="Region and device" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <SelectRow
            id="region"
            label="Region · emergency numbers"
            value={s.region}
            onChange={(v) => void s.update("region", v)}
            className="sm:col-span-2"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r] ?? r}
              </option>
            ))}
          </SelectRow>

          <SelectRow
            id="units"
            label="Units"
            value={s.units}
            onChange={(v) => void s.update("units", v as "metric" | "imperial")}
          >
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </SelectRow>

          <SelectRow
            id="device"
            label="Inference device"
            value={s.preferredDevice}
            onChange={(v) => void s.update("preferredDevice", v as "auto" | "webgpu" | "wasm")}
          >
            <option value="auto">Auto (WebGPU when available)</option>
            <option value="webgpu">WebGPU only</option>
            <option value="wasm">WASM only</option>
          </SelectRow>
        </div>
      </section>

      <section aria-labelledby="switches-h" className="grid gap-4">
        <SectionHeader id="switches-h" eyebrow="Switches" title="Field controls" />
        <div className="plate divide-y divide-line">
          <SettingRow
            label="GPS tagging of saved entries"
            caption="Stamps saved entries with a fix. Works without signal."
            icon={<Satellite size={20} aria-hidden />}
            value={s.gpsEnabled}
            onChange={(v) => void s.update("gpsEnabled", v)}
            {...(s.gpsEnabled ? { hint: <span className={gpsHint.ink}>{gpsHint.text}</span> } : {})}
          />
          <SettingRow
            label="Enable Tier 2 Deep Look features"
            caption="Gemma 4 feature verification on WebGPU devices."
            icon={<Microscope size={20} aria-hidden />}
            value={s.tier2Enabled}
            onChange={(v) => void s.update("tier2Enabled", v)}
          />
        </div>
      </section>

      <section aria-labelledby="display-h" className="grid gap-4">
        <SectionHeader
          id="display-h"
          eyebrow="Display"
          title="Light and contrast"
          lede="The default look is the Night Forest. Switch when the light around you changes."
        />
        <div className="plate divide-y divide-line">
          <SettingRow
            label="High contrast"
            caption="Pure black and white for direct sun — removes the forest backdrop."
            icon={<Sun size={20} aria-hidden />}
            value={s.highContrast}
            onChange={(v) => void s.update("highContrast", v)}
          />
          <SettingRow
            label="Night Camp Mode"
            caption="Embers only: amber and crimson to protect night-adjusted vision."
            icon={<Flame size={20} aria-hidden />}
            value={s.darkMode}
            onChange={(v) => void s.update("darkMode", v)}
          />
        </div>
      </section>

      <HotlineCard db={db} failed={dbFailed} region={s.region} />

      <section aria-labelledby="about-h" className="plate p-5 sm:p-6">
        <SectionHeader id="about-h" eyebrow="Ledger" title="About" />
        <dl className="mt-4 divide-y divide-line">
          <LedgerRow label="App version" value="0.1.0" />
          <LedgerRow label="Safety database" value={dbVersion} />
          <LedgerRow
            label="Promise accepted"
            value={s.disclaimerAcceptedAt ? new Date(s.disclaimerAcceptedAt).toLocaleString() : "not yet"}
          />
        </dl>
        <Link to="/welcome" className={`${buttonClass("secondary")} mt-5 w-full`}>
          Re-read the safety promise and first-run setup
        </Link>
        <HomeLink className={`${buttonClass("ghost")} mt-2 w-full`}>
          <House size={20} aria-hidden /> Back to the home page
        </HomeLink>
      </section>

      <section aria-labelledby="licenses-h" className="plate p-5 sm:p-6">
        <SectionHeader id="licenses-h" eyebrow="Attribution" title="Licenses and attributions" />
        <ul className="mt-5 grid gap-3 text-[0.9375rem] leading-relaxed text-ink">
          {[
            "TrailSnack code: Apache-2.0.",
            "Gemma models (Google DeepMind): Apache-2.0 — EmbeddingGemma 2 and Gemma 4 E2B via Hugging Face `onnx-community`.",
            "Transformers.js (Hugging Face): Apache-2.0.",
            "Lucide icons: ISC.",
            "Typefaces, bundled for offline use: Antonio, Manrope and JetBrains Mono — SIL Open Font License 1.1.",
            "Reference categories: regional poison control centres, national park and extension-service foraging safety guidance, standard field guides. The dataset was authored by an AI agent from general knowledge — see docs/SOURCES.md, and never rely on it without expert review.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-amber" />
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
        <details className="group mt-4 border-t border-line pt-2">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-field font-semibold text-ink select-none press [&::-webkit-details-marker]:hidden">
            <span>Read the full sources and provenance statement</span>
            <ChevronDown
              size={20}
              aria-hidden
              className="shrink-0 text-amber transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <pre className="well mt-2 max-h-96 overflow-auto rounded-field p-4 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
            {sourcesRaw}
          </pre>
        </details>
      </section>
    </section>
  );
}

function SelectRow({
  id,
  label,
  value,
  onChange,
  children,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mono-label block text-ink-faint">
        {label}
      </label>
      <div className="relative mt-2.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field min-h-14 w-full appearance-none px-4 pr-12 font-semibold"
        >
          {children}
        </select>
        <ChevronDown
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-amber"
        />
      </div>
    </div>
  );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="mono-label shrink-0 text-ink-faint">{label}</dt>
      <dd className="mono-value min-w-0 text-right text-[0.9375rem] break-words text-ink">{value}</dd>
    </div>
  );
}

function SettingRow({
  label,
  caption,
  hint,
  icon,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  /** Extra live status line (e.g. the browser's real permission state). */
  hint?: ReactNode;
  icon: ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
            value ? "border-amber/50 bg-amber/10 text-amber" : "border-line-strong text-ink-faint"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="leading-snug font-semibold text-ink">{label}</p>
          <p className="mt-1 text-[0.9375rem] leading-snug text-ink-muted">{caption}</p>
          {hint && <p className="mono-label mt-2 leading-relaxed">{hint}</p>}
        </div>
      </div>
      <Toggle checked={value} onChange={onChange} label={label} />
    </div>
  );
}
