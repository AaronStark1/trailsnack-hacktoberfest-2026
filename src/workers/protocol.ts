export type Device = "webgpu" | "wasm";
export type Tier = "field-id" | "deep-look";

export interface DeepLookJson {
  observed_features: string[];
  candidate_assessments: {
    species_id: string;
    confirmed: string[];
    contradicted: string[];
    not_visible: string[];
  }[];
  photo_quality_issues: (
    | "blurry"
    | "too_dark"
    | "too_far"
    | "partial_specimen"
    | "multiple_specimens"
    | "none"
  )[];
}

export type WorkerRequest =
  | { type: "init"; tier: Tier; device: Device; requestId: string }
  | {
      type: "prepare-species-index";
      requestId: string;
      dbHash: string;
      species: { id: string; prompts: string[]; commonName: string; scientificName: string }[];
      cached?: {
        matrix: ArrayBuffer;
        dims: number;
        speciesIds: string[];
        promptOffsets: number[];
      };
    }
  | {
      type: "identify";
      requestId: string;
      image: { data: ArrayBuffer; width: number; height: number };
      topK: number;
    }
  | {
      type: "deep-look";
      requestId: string;
      image: { data: ArrayBuffer; width: number; height: number };
      candidates: {
        id: string;
        commonName: string;
        scientificName: string;
        checklist: string[];
      }[];
    }
  | { type: "abort"; requestId: string }
  | { type: "dispose"; tier: Tier };

export type WorkerEvent =
  | {
      type: "progress";
      requestId: string;
      tier: Tier;
      file: string;
      loadedBytes: number;
      totalBytes: number;
      overallPct: number;
    }
  | { type: "ready"; requestId: string; tier: Tier; device: Device; loadMs: number }
  | {
      type: "species-index-ready";
      requestId: string;
      matrix: ArrayBuffer;
      dims: number;
      speciesIds: string[];
      promptOffsets: number[];
      computeMs: number;
    }
  | {
      type: "identify-result";
      requestId: string;
      embedding: ArrayBuffer;
      scores: { speciesId: string; similarity: number }[];
      inferenceMs: number;
    }
  | { type: "deep-look-token"; requestId: string; text: string }
  | {
      type: "deep-look-result";
      requestId: string;
      json: DeepLookJson;
      inferenceMs: number;
    }
  | {
      type: "error";
      requestId: string;
      tier: Tier;
      code:
        | "webgpu-unavailable"
        | "oom"
        | "network"
        | "aborted"
        | "model-not-found"
        | "unknown";
      message: string;
      recoverable: boolean;
    };
