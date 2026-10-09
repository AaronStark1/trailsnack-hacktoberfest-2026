import { describe, expect, it } from "vitest";
import { computeVerdict } from "../../src/engine/safetyEngine.ts";
import type { FloraDB, Species } from "../../src/engine/types.ts";

function sp(partial: Partial<Species> & { id: string }): Species {
  return {
    common_names: [partial.id],
    scientific_name: `${partial.id} scientifica`,
    category: "berry",
    edibility: "edible_with_caution",
    toxicity_mechanism: "test",
    regions: ["north-america"],
    seasons: ["summer"],
    habitat: "test",
    visual_prompts: ["a", "b", "c"],
    verification_checklist: ["1", "2", "3", "4", "5"],
    confusable_with: [],
    symptoms_if_ingested: "test",
    onset: "test",
    first_aid: ["call poison control"],
    contact_precautions: "test",
    notes: "test",
    ...partial,
  };
}

function dbWith(species: Species[]): FloraDB {
  return {
    version: "test",
    disclaimer: "test",
    universal_rules: [
      { id: "r1", applies_to: ["berry", "mushroom", "plant"], text: "Rule one." },
      { id: "r2", applies_to: ["mushroom"], text: "Mushroom rule." },
    ],
    species,
    emergency: {
      universal: ["Call for help."],
      regions: [{ id: "north-america", label: "US", poison_control: "1-800-222-1222", emergency: "911" }],
    },
  };
}

describe("safety engine verdict rules", () => {
  it("death cap in the ambiguity band forces TOXIC", () => {
    const db = dbWith([
      sp({ id: "edible-berry", edibility: "edible_with_caution" }),
      sp({ id: "death-cap", category: "mushroom", edibility: "deadly" }),
    ]);
    const v = computeVerdict(
      [
        { speciesId: "edible-berry", similarity: 0.5 },
        { speciesId: "death-cap", similarity: 0.47 },
      ],
      db,
    );
    expect(v.badge).toBe("TOXIC");
    expect(v.hazardousLookalikes.map((s) => s.id)).toContain("death-cap");
  });

  it("chanterelle confident with jack-o'-lantern confusable forces CAUTION (never EDIBLE)", () => {
    const db = dbWith([
      sp({
        id: "golden-chanterelle",
        category: "mushroom",
        edibility: "not_recommended",
        confusable_with: [{ species_id: "jack-o-lantern", how_to_tell_apart: "gills vs ridges" }],
      }),
      sp({ id: "jack-o-lantern", category: "mushroom", edibility: "toxic" }),
    ]);
    const v = computeVerdict(
      [
        { speciesId: "golden-chanterelle", similarity: 0.8 },
        { speciesId: "jack-o-lantern", similarity: 0.3 },
      ],
      db,
    );
    expect(v.badge).toBe("CAUTION");
    expect(v.hazardousLookalikes.map((s) => s.id)).toContain("jack-o-lantern");
  });

  it("blueberry confident with a clean neighborhood yields EDIBLE", () => {
    const db = dbWith([
      sp({
        id: "lowbush-blueberry",
        edibility: "edible_with_caution",
        confusable_with: [{ species_id: "black-huckleberry", how_to_tell_apart: "seeds" }],
      }),
      sp({ id: "black-huckleberry", edibility: "edible_with_caution" }),
    ]);
    const v = computeVerdict(
      [
        { speciesId: "lowbush-blueberry", similarity: 0.7 },
        { speciesId: "black-huckleberry", similarity: 0.5 },
      ],
      db,
    );
    expect(v.badge).toBe("EDIBLE");
    expect(v.confidence).toBe("confident");
    expect(v.headline).toMatch(/verify every checklist item/i);
  });

  it("low similarity yields UNKNOWN with do-not-ingest headline", () => {
    const db = dbWith([sp({ id: "lowbush-blueberry" })]);
    const v = computeVerdict([{ speciesId: "lowbush-blueberry", similarity: 0.1 }], db);
    expect(v.badge).toBe("UNKNOWN");
    expect(v.headline).toBe("Unidentified — do not ingest.");
  });

  it("mushroom top candidate caps at CAUTION even when confident and clean", () => {
    const db = dbWith([
      sp({ id: "king-bolete", category: "mushroom", edibility: "not_recommended" }),
    ]);
    const v = computeVerdict([{ speciesId: "king-bolete", similarity: 0.9 }], db);
    expect(v.badge).toBe("CAUTION");
    expect(v.reasons.join(" ")).toMatch(/mushroom/i);
  });

  it("Deep Look contradiction downgrades confidence and recomputes", () => {
    const db = dbWith([
      sp({
        id: "lowbush-blueberry",
        edibility: "edible_with_caution",
        confusable_with: [{ species_id: "black-huckleberry", how_to_tell_apart: "seeds" }],
      }),
      sp({ id: "black-huckleberry", edibility: "edible_with_caution" }),
    ]);
    const scores = [
      { speciesId: "lowbush-blueberry", similarity: 0.7 },
      { speciesId: "black-huckleberry", similarity: 0.5 },
    ];
    const before = computeVerdict(scores, db);
    expect(before.badge).toBe("EDIBLE");
    const after = computeVerdict(scores, db, {
      deepLook: {
        observed_features: ["red square berries"],
        candidate_assessments: [
          {
            species_id: "lowbush-blueberry",
            confirmed: [],
            contradicted: ["Berries are round, dusty blue"],
            not_visible: [],
          },
        ],
        photo_quality_issues: ["none"],
      },
    });
    expect(after.confidence).not.toBe("confident");
    expect(after.badge).not.toBe("EDIBLE");
  });

  it("Deep Look can never upgrade a verdict", () => {
    const db = dbWith([sp({ id: "lowbush-blueberry" })]);
    const low = computeVerdict([{ speciesId: "lowbush-blueberry", similarity: 0.32 }], db);
    expect(low.confidence).toBe("moderate");
    const withDl = computeVerdict([{ speciesId: "lowbush-blueberry", similarity: 0.32 }], db, {
      deepLook: {
        observed_features: ["perfect blueberries"],
        candidate_assessments: [
          {
            species_id: "lowbush-blueberry",
            confirmed: ["Berries are round, dusty blue"],
            contradicted: [],
            not_visible: [],
          },
        ],
        photo_quality_issues: ["none"],
      },
    });
    expect(withDl.confidence).toBe("moderate");
    expect(withDl.badge).toBe("CAUTION");
  });

  it("toxic species in the plausible set forces TOXIC", () => {
    const db = dbWith([
      sp({ id: "riverbank-grape", edibility: "edible_with_caution" }),
      sp({ id: "canada-moonseed", edibility: "deadly" }),
    ]);
    const v = computeVerdict(
      [
        { speciesId: "riverbank-grape", similarity: 0.55 },
        { speciesId: "canada-moonseed", similarity: 0.53 },
      ],
      db,
    );
    expect(v.badge).toBe("TOXIC");
  });
});
