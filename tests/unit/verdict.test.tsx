import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import VerdictBadge from "../../src/components/assess/VerdictBadge.tsx";
import type { Badge } from "../../src/engine/types.ts";

describe("VerdictBadge", () => {
  const cases: { badge: Badge; headline: string }[] = [
    { badge: "EDIBLE", headline: "Edible per reference — verify every checklist item." },
    { badge: "CAUTION", headline: "Caution — do not ingest without expert confirmation." },
    { badge: "TOXIC", headline: "Toxic — do not touch or ingest." },
    { badge: "UNKNOWN", headline: "Unidentified — do not ingest." },
  ];
  for (const c of cases) {
    it(`renders ${c.badge} with its headline, icon, and confidence`, () => {
      const { container } = render(<VerdictBadge badge={c.badge} headline={c.headline} confidence="moderate" />);
      expect(screen.getByRole("status", { name: new RegExp(`Verdict: ${c.badge}`) })).toBeInTheDocument();
      expect(screen.getByText(c.badge)).toBeInTheDocument();
      expect(screen.getByText(c.headline)).toBeInTheDocument();
      expect(screen.getByText("moderate")).toBeInTheDocument();
      // Each badge must render its Lucide icon (an inline svg), not text alone.
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  }
});
