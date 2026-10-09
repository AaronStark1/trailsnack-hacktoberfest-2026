import { expect, test, type Page } from "@playwright/test";

// The headless test browser exposes navigator.gpu but no working adapter, so
// the adapter-aware gate must print the fixed unavailable string. (Probed:
// no launch flag removes navigator.gpu in this Chromium, which is why the
// expectation is a fixed string rather than a flag-derived one.)
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

test("models screen shows storage estimate and Tier 2 WebGPU gate as unavailable", async ({
  page,
}) => {
  await acceptDisclaimer(page);
  await page.goto("/models");
  await expect(page.getByTestId("quota-inspector")).toBeVisible();
  await expect(page.getByTestId("quota-text")).toContainText(/used/);
  await expect(page.locator("li", { hasText: "WebGPU available" })).toContainText("WebGPU unavailable");
});
