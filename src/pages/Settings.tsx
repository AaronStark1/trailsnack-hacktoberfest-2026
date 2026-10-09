import { Link } from "react-router-dom";
import Toggle from "../components/ui/Toggle.tsx";
import { useSettingsStore } from "../stores/settingsStore.ts";
import { loadDatabase } from "../engine/loadDatabase.ts";
import { useEffect, useState } from "react";

const REGIONS = ["north-america", "uk-ireland", "europe", "australia-nz", "global"];

export default function Settings() {
  const s = useSettingsStore();
  const [dbVersion, setDbVersion] = useState("…");
  useEffect(() => {
    void loadDatabase()
      .then((db) => setDbVersion(db.version))
      .catch(() => setDbVersion("bundled (offline)"));
  }, []);

  return (
    <section aria-labelledby="settings-h" className="grid gap-4">
      <h1 id="settings-h" className="text-3xl font-extrabold">
        Settings
      </h1>

      <div>
        <label htmlFor="region" className="text-lg font-semibold">
          Region (emergency numbers)
        </label>
        <select
          id="region"
          value={s.region}
          onChange={(e) => void s.update("region", e.target.value)}
          className="mt-1 block min-h-14 w-full rounded-xl border border-black/20 bg-white px-3 text-lg"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="units" className="text-lg font-semibold">
          Units
        </label>
        <select
          id="units"
          value={s.units}
          onChange={(e) => void s.update("units", e.target.value as "metric" | "imperial")}
          className="mt-1 block min-h-14 w-full rounded-xl border border-black/20 bg-white px-3 text-lg"
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </select>
      </div>

      <div>
        <label htmlFor="device" className="text-lg font-semibold">
          Inference device
        </label>
        <select
          id="device"
          value={s.preferredDevice}
          onChange={(e) => void s.update("preferredDevice", e.target.value as "auto" | "webgpu" | "wasm")}
          className="mt-1 block min-h-14 w-full rounded-xl border border-black/20 bg-white px-3 text-lg"
        >
          <option value="auto">Auto (WebGPU when available)</option>
          <option value="webgpu">WebGPU only</option>
          <option value="wasm">WASM only</option>
        </select>
      </div>

      <SettingRow label="GPS tagging of saved entries" value={s.gpsEnabled} onChange={(v) => void s.update("gpsEnabled", v)} />
      <SettingRow label="High contrast" value={s.highContrast} onChange={(v) => void s.update("highContrast", v)} />
      <SettingRow label="Dark mode (night camp)" value={s.darkMode} onChange={(v) => void s.update("darkMode", v)} />
      <SettingRow label="Enable Tier 2 Deep Look features" value={s.tier2Enabled} onChange={(v) => void s.update("tier2Enabled", v)} />

      <div className="rounded-2xl border border-black/10 p-4">
        <p>App version: <strong>0.1.0</strong></p>
        <p>Safety database: <strong>{dbVersion}</strong></p>
        <p>
          Safety promise accepted:{" "}
          <strong>{s.disclaimerAcceptedAt ? new Date(s.disclaimerAcceptedAt).toLocaleString() : "not yet"}</strong>
        </p>
        <Link to="/welcome" className="mt-2 inline-block min-h-12 font-semibold text-(--color-trail) underline">
          Re-read the safety promise and first-run setup
        </Link>
      </div>

      <div className="rounded-2xl border border-black/10 p-4">
        <h2 className="text-xl font-bold">Licenses and attributions</h2>
        <ul className="mt-1 list-disc pl-6">
          <li>TrailSnack code: Apache-2.0.</li>
          <li>Gemma models (Google DeepMind): Apache-2.0 — EmbeddingGemma 2 and Gemma 4 E2B via Hugging Face `onnx-community`.</li>
          <li>Transformers.js (Hugging Face): Apache-2.0.</li>
          <li>Lucide icons: ISC.</li>
          <li>Reference categories: regional poison control centres, national park and extension-service foraging safety guidance, standard field guides. The dataset was authored by an AI agent from general knowledge — see docs/SOURCES.md, and never rely on it without expert review.</li>
        </ul>
      </div>
    </section>
  );
}

function SettingRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Toggle checked={value} onChange={onChange} label={label} />
      <span className="text-lg">{label}</span>
    </div>
  );
}
