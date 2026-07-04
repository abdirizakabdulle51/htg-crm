import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.loginAs("am");
});

test("AM dashboard shows target health card", async ({ page }) => {
  await page.goto("/account-manager");
  await expect(page.getByText("Target Health")).toBeVisible();
});

test("Health card shows GREEN when AM is 10% ahead of pace", async ({ page }) => {
  await page.route("**/api/v1/targets/health", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: healthEnvelope("GREEN", 10000),
        error: null,
        meta: {},
      }),
    });
  });
  await page.goto("/account-manager");
  await expect(page.getByText("GREEN")).toBeVisible();
});

test("Health card shows RED when AM is 15% behind pace", async ({ page }) => {
  await page.route("**/api/v1/targets/health", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: healthEnvelope("RED", -15000),
        error: null,
        meta: {},
      }),
    });
  });
  await page.goto("/account-manager");
  await expect(page.getByText("RED")).toBeVisible();
});

function healthEnvelope(health: "GREEN" | "RED", gap: number) {
  return {
    user_id: "00000000-0000-0000-0000-000000000001",
    year: 2026,
    quarter: 3,
    quarterly_target_usd: 100000,
    achieved_usd: health === "GREEN" ? 60000 : 35000,
    expected_cumulative_usd: 50000,
    gap_usd: gap,
    gap_percent: health === "GREEN" ? 10 : -15,
    health,
    working_days_total: 65,
    working_days_elapsed: 32,
    working_days_remaining: 33,
    required_daily_pace_usd: health === "GREEN" ? 0 : 1969.7,
    ai_advice: health === "GREEN" ? "Ahead of pace." : "Behind pace.",
  };
}
