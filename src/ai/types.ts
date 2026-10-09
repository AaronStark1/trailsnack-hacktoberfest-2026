import type { DeepLookJson } from "../workers/protocol.ts";

export type { DeepLookJson };

export const TIER1_MODEL_ID = "onnx-community/embeddinggemma-2-ONNX";
export const TIER2_MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";

export type Device = "webgpu" | "wasm";
export type Tier = "field-id" | "deep-look";

export interface IdentificationScore {
  speciesId: string;
  similarity: number;
}

export interface IdentificationResult {
  embedding: number[];
  scores: IdentificationScore[];
  inferenceMs: number;
  device: Device;
}

export interface DeepLookResult {
  json: DeepLookJson;
  inferenceMs: number;
}

export const DEEP_LOOK_SCHEMA = {
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
