import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Confusable {
  species_id: string;
  how_to_tell_apart: string;
}

interface SpeciesEntry {
  id: string;
  category: string;
  edibility: string;
  common_names: string[];
  confusable_with: Confusable[];
}

interface FloraJson {
  version: string;
  species: SpeciesEntry[];
}

function loadDb(): FloraJson {
  return JSON.parse(readFileSync("public/data/flora_safety_db.json", "utf8")) as FloraJson;
}

describe("flora database corrections (H2)", () => {
  it("has the expected species count and version", () => {
    const db = loadDb();
    expect(db.version).toBe("2026.10.2");
    expect(db.species).toHaveLength(81);
  });

  it("contains deadly false hellebore linked both ways with ramps", () => {
    const db = loadDb();
    const hellebore = db.species.find((s) => s.id === "false-hellebore");
    expect(hellebore).toBeDefined();
    expect(hellebore?.edibility).toBe("deadly");
    expect(hellebore?.category).toBe("plant");
    expect(hellebore?.confusable_with.map((c) => c.species_id)).toContain("ramps");
    const ramps = db.species.find((s) => s.id === "ramps");
    expect(ramps?.confusable_with.map((c) => c.species_id)).toContain("false-hellebore");
  });

  it("contains atlantic poison oak as a contact hazard", () => {
    const db = loadDb();
    const oak = db.species.find((s) => s.id === "atlantic-poison-oak");
    expect(oak?.edibility).toBe("contact_hazard");
    expect(oak?.category).toBe("plant");
  });

  it("keeps pacific poison oak separate from the atlantic entry", () => {
    const db = loadDb();
    const oak = db.species.find((s) => s.id === "poison-oak");
    expect(oak?.common_names).not.toContain("Atlantic poison oak");
    expect(oak?.confusable_with.map((c) => c.species_id)).toContain("atlantic-poison-oak");
  });

  it("drops the inaccurate alternate common names", () => {
    const db = loadDb();
    const names = new Map(db.species.map((s) => [s.id, s.common_names]));
    expect(names.get("pacific-yew")).not.toContain("English yew");
    expect(names.get("american-holly")).not.toContain("English holly");
    expect(names.get("european-mistletoe")).not.toContain("American mistletoe");
    expect(names.get("yellow-morel")).not.toContain("Black morel");
  });

  it("resolves every confusable reference including the new ones", () => {
    const db = loadDb();
    const ids = new Set(db.species.map((s) => s.id));
    for (const sp of db.species) {
      for (const c of sp.confusable_with) {
        expect(ids.has(c.species_id)).toBe(true);
      }
    }
  });
});
