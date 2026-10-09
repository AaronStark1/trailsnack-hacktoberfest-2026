import { describe, expect, it } from "vitest";
import { parseDeepLookJson } from "../../src/engine/deepLookSchema.ts";

describe("Deep Look JSON parser", () => {
  it("accepts valid output, strips code fences", () => {
    const raw = '```json\n{"observed_features":["red cap"],"candidate_assessments":[{"species_id":"fly-agaric","confirmed":["red cap"],"contradicted":[],"not_visible":["gills"]}],"photo_quality_issues":["none"]}\n```';
    const j = parseDeepLookJson(raw);
    expect(j.observed_features).toEqual(["red cap"]);
    expect(j.candidate_assessments[0]?.species_id).toBe("fly-agaric");
    expect(j.photo_quality_issues).toEqual(["none"]);
  });

  it("rejects invalid JSON and bad enums", () => {
    expect(() => parseDeepLookJson("not json")).toThrow();
    expect(() =>
      parseDeepLookJson(
        '{"observed_features":[],"candidate_assessments":[],"photo_quality_issues":["foggy"]}',
      ),
    ).toThrow();
    expect(() =>
      parseDeepLookJson(
        '{"observed_features":["a","b","c","d","e","f","g","h","i","j","k","l","m"],"candidate_assessments":[],"photo_quality_issues":["none"]}',
      ),
    ).toThrow();
  });
});
