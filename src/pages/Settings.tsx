import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Microscope, MoonStar, Satellite, SlidersHorizontal, Sun } from "lucide-react";
import Toggle from "../components/ui/Toggle.tsx";
import SectionHeader from "../components/ui/SectionHeader.tsx";
import HotlineCard from "../components/settings/HotlineCard.tsx";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { loadDatabase } from "../engine/loadDatabase.ts";
import type { FloraDB } from "../engine/types.ts";
import sourcesRaw from "../../docs/SOURCES.md?raw";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "global"];

const REGION_LABELS: Record<string, string> = {
  "north-america": "North America",
  "uk-ireland": "UK & Ireland",
  europe: "Europe",
  "australia-nz": "Australia & NZ",
  global: "Global",
};

export default function Settings() {
  const s = useSettingsStore();
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

  return (
    <section aria-labelledby="settings-h" className="grid gap-5">
      <SectionHeader as="h1" id="settings-h" eyebrow="05 · FIELD SETTINGS" title="Settings" />

      <div className="tac-card overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-3">
          <span className="well flex size-11 shrink-0 items-center justify-center rounded-tac text-trail">
            <SlidersHorizontal size={22} aria-hidden />
          </span>
          <h2 className="mono-label text-ink-muted">Locale &amp; compute</h2>
        </div>
        <div className="grid gap-4 p-4">
          <SelectRow id="region" label="Region · emergency numbers" value={s.region} onChange={(v) => void s.update("region", v)}>
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
      </div>

      <section aria-labelledby="switches-h" className="grid gap-3">
        <SectionHeader id="switches-h" eyebrow="SWITCHES" title="Field controls" />
        <SettingRow
          label="GPS tagging of saved entries"
          caption="Stamps saved entries with a fix · offline"
          icon={<Satellite size={22} aria-hidden />}
          value={s.gpsEnabled}
          onChange={(v) => void s.update("gpsEnabled", v)}
        />
        <SettingRow
          label="High contrast"
          caption="Pure black / white for direct sun"
          icon={<Sun size={22} aria-hidden />}
          value={s.highContrast}
          onChange={(v) => void s.update("highContrast", v)}
        />
        <SettingRow
          label="Night Camp Mode"
          caption="Charcoal, amber and crimson to protect night-adjusted vision"
          icon={<MoonStar size={22} aria-hidden />}
          value={s.darkMode}
          onChange={(v) => void s.update("darkMode", v)}
        />
        <SettingRow
          label="Enable Tier 2 Deep Look features"
          caption="Gemma 4 feature verification · WebGPU"
          icon={<Microscope size={22} aria-hidden />}
          value={s.tier2Enabled}
          onChange={(v) => void s.update("tier2Enabled", v)}
        />
      </section>

      <HotlineCard db={db} failed={dbFailed} region={s.region} />

      <section aria-labelledby="about-h" className="tac-card p-4">
        <SectionHeader id="about-h" eyebrow="LEDGER" title="About" />
        <dl className="mt-1 divide-y divide-line">
          <LedgerRow label="App version" value="0.1.0" />
          <LedgerRow label="Safety database" value={dbVersion} />
          <LedgerRow
            label="Promise accepted"
            value={s.disclaimerAcceptedAt ? new Date(s.disclaimerAcceptedAt).toLocaleString() : "not yet"}
          />
        </dl>
        <Link
          to="/welcome"
          className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-tac border-2 border-trail bg-surface px-5 text-center text-lg font-bold tracking-tight text-trail no-underline bevel-light tac-press hover:bg-surface-2"
        >
          Re-read the safety promise and first-run setup
        </Link>
      </section>

      <section aria-labelledby="licenses-h" className="tac-card p-4">
        <SectionHeader id="licenses-h" eyebrow="ATTRIBUTION" title="Licenses and attributions" />
        <ul className="mt-3 grid gap-2 pl-5 text-base marker:text-trail list-disc">
          <li>TrailSnack code: Apache-2.0.</li>
          <li>Gemma models (Google DeepMind): Apache-2.0 — EmbeddingGemma 2 and Gemma 4 E2B via Hugging Face `onnx-community`.</li>
          <li>Transformers.js (Hugging Face): Apache-2.0.</li>
          <li>Lucide icons: ISC.</li>
          <li>Reference categories: regional poison control centres, national park and extension-service foraging safety guidance, standard field guides. The dataset was authored by an AI agent from general knowledge — see docs/SOURCES.md, and never rely on it without expert review.</li>
        </ul>
        <details className="group mt-3">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-tac px-1 font-bold text-trail select-none tac-press [&::-webkit-details-marker]:hidden">
            <span>Read the full sources and provenance statement</span>
            <ChevronDown size={22} aria-hidden className="shrink-0 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <pre className="well mt-2 max-h-96 overflow-auto rounded-tac p-3 font-mono text-sm whitespace-pre-wrap text-ink">{sourcesRaw}</pre>
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mono-label block text-ink-muted">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="well min-h-14 w-full appearance-none rounded-tac px-3 pr-12 text-lg font-semibold text-ink"
        >
          {children}
        </select>
        <ChevronDown
          size={22}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </div>
  );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="mono-label shrink-0 text-ink-muted">{label}</dt>
      <dd className="mono-value min-w-0 text-right text-base font-bold break-words text-ink">{value}</dd>
    </div>
  );
}

function SettingRow({
  label,
  caption,
  icon,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  icon: ReactNode;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="tac-card flex min-h-[72px] items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`well flex size-11 shrink-0 items-center justify-center rounded-tac ${
            value ? "text-trail" : "text-ink-faint"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{label}</p>
          <p className="mono-label mt-1.5 leading-relaxed text-ink-muted">{caption}</p>
        </div>
      </div>
      <Toggle checked={value} onChange={onChange} label={label} />
    </div>
  );
}
