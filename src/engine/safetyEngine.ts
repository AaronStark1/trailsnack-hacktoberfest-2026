import { THRESHOLDS } from "./thresholds.ts";
import type {
  Badge,
  Confidence,
  FloraDB,
  SafetyVerdict,
  Species,
  TierScore,
} from "./types.ts";
import type { DeepLookJson } from "./deepLookSchema.ts";

function sortedScores(scores: TierScore[]): TierScore[] {
  return [...scores].sort((a, b) => b.similarity - a.similarity);
}

function confidenceOf(top1: number, top2: number): Confidence {
  if (top1 >= THRESHOLDS.CONFIDENT_SIMILARITY && top1 - top2 >= THRESHOLDS.MARGIN_CONFIDENT) {
    return "confident";
  }
  if (top1 >= THRESHOLDS.ABS_MIN_SIMILARITY) return "moderate";
  return "low";
}

/**
 * Edible-gate neighborhood check, exported for direct testing: every
 * plausible species must be edible_with_caution AND none may be a mushroom.
 * The mushroom clause is defense-in-depth — with the current thresholds a
 * mushroom in the band always costs confidence first, but post-calibration
 * thresholds could reopen the hole.
 */
export function isEdibleNeighborhood(plausible: Species[]): boolean {
  return (
    plausible.every((s) => s.edibility === "edible_with_caution") &&
    plausible.every((s) => s.category !== "mushroom")
  );
}

function headlineFor(badge: Badge): string {
  switch (badge) {
    case "EDIBLE":
      return "Edible per reference — verify every checklist item.";
    case "CAUTION":
      return "Caution — do not ingest without expert confirmation.";
    case "TOXIC":
      return "Toxic — do not touch or ingest.";
    case "UNKNOWN":
      return "Unidentified — do not ingest.";
  }
}

/**
 * Deterministic safety verdict. Only moves toward caution; model output is
 * advisory input only. Default verdict is UNKNOWN → do not ingest.
 */
export function computeVerdict(
  scores: TierScore[],
  db: FloraDB,
  opts?: { deepLook?: DeepLookJson; region?: string; topK?: number },
): SafetyVerdict {
  const reasons: string[] = [];
  const byId = new Map<string, Species>(db.species.map((s) => [s.id, s]));
  const ranked = sortedScores(scores);
  const top = ranked[0];
  const second = ranked[1];

  const emptyVerdict = (why: string): SafetyVerdict => ({
    badge: "UNKNOWN",
    headline: headlineFor("UNKNOWN"),
    confidence: "low",
    topCandidate: null,
    plausibleCandidates: [],
    hazardousLookalikes: [],
    checklist: [],
    universalRules: db.universal_rules.map((r) => r.text),
    emergency: {
      universal: db.emergency.universal,
      regional: db.emergency.regions.find((r) => r.id === (opts?.region ?? "north-america")) ?? db.emergency.regions[0] ?? null,
    },
    reasons: [why],
  });

  if (!top || top.similarity < THRESHOLDS.ABS_MIN_SIMILARITY) {
    return emptyVerdict(
      `Top similarity ${top ? top.similarity.toFixed(3) : "none"} is below ABS_MIN_SIMILARITY (${THRESHOLDS.ABS_MIN_SIMILARITY}); no match considered.`,
    );
  }

  const cutoff = Math.max(THRESHOLDS.ABS_MIN_SIMILARITY, top.similarity - THRESHOLDS.AMBIGUITY_BAND);
  const plausibleRows = ranked.filter((r) => r.similarity >= cutoff);
  const plausible = plausibleRows
    .map((r) => byId.get(r.speciesId))
    .filter((s): s is Species => s !== undefined);
  reasons.push(
    `Plausible set: ${plausible.length} species at similarity ≥ max(ABS_MIN ${THRESHOLDS.ABS_MIN_SIMILARITY}, top1 ${top.similarity.toFixed(3)} − band ${THRESHOLDS.AMBIGUITY_BAND}) = ${cutoff.toFixed(3)}.`,
  );

  let confidence = confidenceOf(top.similarity, second?.similarity ?? -1);
  reasons.push(
    `Confidence ${confidence}: top1 ${top.similarity.toFixed(3)}, margin over top2 ${((top.similarity - (second?.similarity ?? top.similarity))).toFixed(3)} (need ≥ ${THRESHOLDS.MARGIN_CONFIDENT} with top1 ≥ ${THRESHOLDS.CONFIDENT_SIMILARITY} for confident).`,
  );

  // Deep Look adjustment — one direction only: never upgrades.
  const dl = opts?.deepLook;
  if (dl) {
    const topId = byId.get(top.speciesId)?.id;
    const assessment = dl.candidate_assessments.find((a) => a.species_id === topId);
    if (assessment && assessment.contradicted.length > 0) {
      const before = confidence;
      confidence = before === "confident" ? "moderate" : "low";
      reasons.push(
        `Deep Look contradicted ${assessment.contradicted.length} checklist item(s) for the top candidate; confidence downgraded ${before} → ${confidence}.`,
      );
    }
    const qualityIssues = dl.photo_quality_issues.filter((q) => q !== "none");
    if (qualityIssues.length > 0) {
      const before = confidence;
      confidence = before === "confident" ? "moderate" : "low";
      reasons.push(
        `Photo quality issues (${qualityIssues.join(", ")}); confidence downgraded ${before} → ${confidence}.`,
      );
    }
    if ((!assessment || assessment.contradicted.length === 0) && qualityIssues.length === 0) {
      reasons.push("Deep Look reported no contradictions and clean photo quality; confidence unchanged (Deep Look can never upgrade).");
    }
  }

  const topSpecies = byId.get(top.speciesId) ?? null;

  // Hazardous lookalikes: deduped union of toxic/deadly confusables of plausible set + any deadly/toxic in plausible set itself.
  const hazardous = new Map<string, Species>();
  for (const sp of plausible) {
    if (sp.edibility === "deadly" || sp.edibility === "toxic" || sp.edibility === "contact_hazard") {
      hazardous.set(sp.id, sp);
    }
    for (const c of sp.confusable_with) {
      const ref = byId.get(c.species_id);
      if (ref && (ref.edibility === "deadly" || ref.edibility === "toxic" || ref.edibility === "contact_hazard")) {
        hazardous.set(ref.id, ref);
      }
    }
  }
  // Also include confusables of the top candidate even below cutoff (worst-case rule).
  if (topSpecies) {
    for (const c of topSpecies.confusable_with) {
      const ref = byId.get(c.species_id);
      if (ref && (ref.edibility === "deadly" || ref.edibility === "toxic" || ref.edibility === "contact_hazard")) {
        if (!hazardous.has(ref.id)) {
          hazardous.set(ref.id, ref);
          reasons.push(`Worst-case rule: top candidate lists hazardous confusable ${ref.id}; included as lookalike.`);
        }
      }
    }
  }

  const plausibleEds = new Set(plausible.map((s) => s.edibility));
  const plausibleToxic = plausible.some(
    (s) => s.edibility === "toxic" || s.edibility === "contact_hazard",
  );
  const plausibleDeadly = plausible.some((s) => s.edibility === "deadly");
  let badge: Badge;
  if (plausibleDeadly || [...hazardous.values()].some((s) => s.edibility === "deadly")) {
    badge = "TOXIC";
    reasons.push("Worst-case rule: a deadly species is in the plausible set or confusables → TOXIC (deadly).");
  } else if (plausibleToxic) {
    badge = "TOXIC";
    reasons.push("Worst-case rule: a toxic/contact-hazard species is in the plausible set → TOXIC.");
  } else if (hazardous.size > 0) {
    // A hazardous species is listed as a confusable of the top candidate but is
    // NOT itself in the plausible set: the model is not confusing the two, but
    // the human still could — cap at CAUTION so an expert must confirm.
    // (Resolves the §7.3-step-3 / Gate-4-example tension in favor of the Gate 4
    // example: chanterelle confident with jack-o'-lantern confusable → CAUTION.
    // See docs/DECISIONS.md D-005.)
    badge = "CAUTION";
    reasons.push(
      `Hazardous lookalike (${[...hazardous.values()].map((s) => s.id).join(", ")}) is a listed confusable but outside the plausible set → CAUTION; expert must exclude it.`,
    );
  } else if (plausibleEds.has("not_recommended")) {
    badge = "CAUTION";
    reasons.push("A not_recommended species is in the plausible set → CAUTION.");
  } else if (topSpecies?.category === "mushroom") {
    badge = "CAUTION";
    reasons.push("Category rule: top candidate is a mushroom; verdict capped at CAUTION (no app confirms wild mushrooms).");
  } else if (confidence === "confident" && topSpecies && isEdibleNeighborhood(plausible)) {
    // (The mushroom category branch above already capped mushroom tops at
    // CAUTION; the every(category !== mushroom) check additionally closes the
    // hole where a non-mushroom top has a mushroom inside the plausible set.)
    badge = "EDIBLE";
    reasons.push("Edible gate: confident, every plausible species edible_with_caution, no hazardous confusables, not a mushroom → EDIBLE (still verify every checklist item).");
  } else {
    badge = "CAUTION";
    reasons.push("Edible gate not met (confidence below confident or neighborhood not clean) → CAUTION.");
  }

  const checklist = topSpecies ? [...topSpecies.verification_checklist] : [];
  const universalRules = db.universal_rules
    .filter((r) => !topSpecies || r.applies_to.includes(topSpecies.category))
    .map((r) => r.text);
  if (topSpecies?.category === "mushroom") {
    for (const r of db.universal_rules) {
      if (!universalRules.includes(r.text)) universalRules.push(r.text);
    }
    reasons.push("All universal mushroom rules attached.");
  }

  return {
    badge,
    headline: headlineFor(badge),
    confidence,
    topCandidate: topSpecies,
    plausibleCandidates: plausible,
    hazardousLookalikes: [...hazardous.values()],
    checklist,
    universalRules,
    emergency: {
      universal: db.emergency.universal,
      regional: db.emergency.regions.find((r) => r.id === (opts?.region ?? "north-america")) ?? db.emergency.regions[0] ?? null,
    },
    reasons,
  };
}
