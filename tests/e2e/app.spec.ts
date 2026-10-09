import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "specimen.png");

async function acceptDisclaimer(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome/);
  const accept = page.getByRole("button", { name: /accept and hit the trail/i });
  await expect(accept).toBeDisabled();
  await page.getByRole("checkbox", { name: /i understand/i }).check();
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page).toHaveURL(/\/scan/);
}

async function setScores(page: Page, scores: { speciesId: string; similarity: number }[]): Promise<void> {
  await page.evaluate((s) => {
    (window as unknown as { __trailsnack: { setMockScores: (x: unknown) => void } }).__trailsnack.setMockScores(s);
  }, scores);
}

async function uploadAndAssess(page: Page): Promise<void> {
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles(FIXTURE);
  await expect(page).toHaveURL(/\/assess\//, { timeout: 30_000 });
  await expect(page.getByTestId("assessment")).toBeVisible({ timeout: 30_000 });
}

test.describe("first run", () => {
  test("disclaimer gate blocks scan until accepted", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/scan");
    await expect(page).toHaveURL(/\/welcome/);
    await acceptDisclaimer(page);
    expect(errors).toEqual([]);
  });
});

test.describe("assessment verdicts (mocked Tier 1)", () => {
  const scenarios: { name: string; scores: { speciesId: string; similarity: number }[]; badge: string }[] = [
    {
      name: "EDIBLE",
      scores: [
        { speciesId: "wild-strawberry", similarity: 0.7 },
        { speciesId: "rose-hips", similarity: 0.5 },
      ],
      badge: "EDIBLE",
    },
    {
      name: "CAUTION",
      scores: [
        { speciesId: "golden-chanterelle", similarity: 0.8 },
        { speciesId: "jack-o-lantern", similarity: 0.3 },
      ],
      badge: "CAUTION",
    },
    {
      name: "TOXIC",
      scores: [
        { speciesId: "riverbank-grape", similarity: 0.55 },
        { speciesId: "canada-moonseed", similarity: 0.53 },
      ],
      badge: "TOXIC",
    },
    {
      name: "UNKNOWN",
      scores: [{ speciesId: "lowbush-blueberry", similarity: 0.1 }],
      badge: "UNKNOWN",
    },
  ];

  for (const s of scenarios) {
    test(`file upload produces ${s.name}`, async ({ page }) => {
      await acceptDisclaimer(page);
      await setScores(page, s.scores);
      await uploadAndAssess(page);
      await expect(page.getByTestId("verdict")).toContainText(s.badge);
    });
  }

  test("save to log, reload persists, export produces JSON", async ({ page }) => {
    await acceptDisclaimer(page);
    await setScores(page, [
      { speciesId: "wild-strawberry", similarity: 0.7 },
      { speciesId: "rose-hips", similarity: 0.5 },
    ]);
    await uploadAndAssess(page);
    await page.getByRole("button", { name: /save to field log/i }).click();
    await expect(page).toHaveURL(/\/log\//);
    await page.reload();
    await expect(page.getByTestId("verdict")).toContainText("EDIBLE");
    await expect(page.getByText("wild-strawberry").first()).toBeVisible();
    await page.goto("/log");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /export json/i }).click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/trailsnack-log\.json/);
  });
});

test.describe("models screen", () => {
  test("shows storage estimate and Tier 2 WebGPU gate", async ({ page }) => {
    await acceptDisclaimer(page);
    await page.goto("/models");
    await expect(page.getByTestId("quota-inspector")).toBeVisible();
    await expect(page.getByTestId("quota-text")).toContainText(/used/);
    await expect(page.locator("li", { hasText: "WebGPU available" })).toContainText("WebGPU unavailable");
  });
});
