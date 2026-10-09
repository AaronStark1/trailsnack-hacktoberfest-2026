import type { DeepLookJson } from "./deepLookSchema.ts";

export type Category = "berry" | "mushroom" | "plant";
export type Edibility =
  | "edible_with_caution"
  | "not_recommended"
  | "toxic"
  | "deadly"
  | "contact_hazard";

export interface Confusable {
  species_id: string;
  how_to_tell_apart: string;
}

export interface Species {
  id: string;
  common_names: string[];
  scientific_name: string;
  category: Category;
  edibility: Edibility;
  toxicity_mechanism: string;
  regions: string[];
  seasons: string[];
  habitat: string;
  visual_prompts: string[];
  verification_checklist: string[];
  confusable_with: Confusable[];
  symptoms_if_ingested: string;
  onset: string;
  first_aid: string[];
  contact_precautions: string;
  notes: string;
}

export interface EmergencyInfo {
  universal: string[];
  regions: { id: string; label: string; poison_control: string; emergency: string; note?: string }[];
}

export interface FloraDB {
  version: string;
  disclaimer: string;
  universal_rules: { id: string; applies_to: Category[]; text: string }[];
  species: Species[];
  emergency: EmergencyInfo;
}

export type Badge = "EDIBLE" | "CAUTION" | "TOXIC" | "UNKNOWN";
export type Confidence = "confident" | "moderate" | "low";

export interface TierScore {
  speciesId: string;
  similarity: number;
}

export interface SafetyVerdict {
  badge: Badge;
  headline: string;
  confidence: Confidence;
  topCandidate: Species | null;
  plausibleCandidates: Species[];
  hazardousLookalikes: Species[];
  checklist: string[];
  universalRules: string[];
  emergency: { universal: string[]; regional: EmergencyInfo["regions"][number] | null };
  reasons: string[];
}

export type { DeepLookJson };
