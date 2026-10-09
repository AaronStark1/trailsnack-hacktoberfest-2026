export const DEEP_LOOK_JSON_SCHEMA = {
  type: "object",
  properties: {
    observed_features: { type: "array", items: { type: "string" }, maxItems: 12 },
    candidate_assessments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          species_id: { type: "string" },
          confirmed: { type: "array", items: { type: "string" } },
          contradicted: { type: "array", items: { type: "string" } },
          not_visible: { type: "array", items: { type: "string" } },
        },
        required: ["species_id", "confirmed", "contradicted", "not_visible"],
        additionalProperties: false,
      },
    },
    photo_quality_issues: {
      type: "array",
      items: {
        enum: ["blurry", "too_dark", "too_far", "partial_specimen", "multiple_specimens", "none"],
      },
    },
  },
  required: ["observed_features", "candidate_assessments", "photo_quality_issues"],
  additionalProperties: false,
} as const;

export type PhotoQualityIssue =
  | "blurry"
  | "too_dark"
  | "too_far"
  | "partial_specimen"
  | "multiple_specimens"
  | "none";

export interface DeepLookJson {
  observed_features: string[];
  candidate_assessments: {
    species_id: string;
    confirmed: string[];
    contradicted: string[];
    not_visible: string[];
  }[];
  photo_quality_issues: PhotoQualityIssue[];
}

const QUALITY_SET = new Set(["blurry", "too_dark", "too_far", "partial_specimen", "multiple_specimens", "none"]);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function parseDeepLookJson(text: string): DeepLookJson {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    throw new Error("Deep Look output was not valid JSON");
  }
  if (typeof obj !== "object" || obj === null) throw new Error("Deep Look JSON must be an object");
  const o = obj as Record<string, unknown>;
  if (!isStringArray(o.observed_features)) throw new Error("observed_features must be string[]");
  if (o.observed_features.length > 12) throw new Error("observed_features exceeds maxItems 12");
  if (!Array.isArray(o.candidate_assessments)) throw new Error("candidate_assessments must be an array");
  for (const c of o.candidate_assessments) {
    if (typeof c !== "object" || c === null) throw new Error("candidate_assessment must be an object");
    const cc = c as Record<string, unknown>;
    if (typeof cc.species_id !== "string") throw new Error("species_id must be a string");
    if (!isStringArray(cc.confirmed) || !isStringArray(cc.contradicted) || !isStringArray(cc.not_visible)) {
      throw new Error("confirmed/contradicted/not_visible must be string[]");
    }
  }
  if (!Array.isArray(o.photo_quality_issues) || !o.photo_quality_issues.every((x) => typeof x === "string" && QUALITY_SET.has(x))) {
    throw new Error("photo_quality_issues contains unknown values");
  }
  return obj as DeepLookJson;
}
