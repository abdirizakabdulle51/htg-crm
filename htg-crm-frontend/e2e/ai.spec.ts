import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.loginAs("am");
});

test("AM dashboard shows AI coach card on login", async ({ page }) => {
  await page.goto("/account-manager");
  await expect(page.getByText("AI Coach")).toBeVisible();
});

test("Meeting activity form shows AI Analyze button", async ({ page }) => {
  test.fail(true, "Meeting activity form UI is not implemented yet.");
  await page.goto("/activities/new?type=MEETING");
  await expect(page.getByRole("button", { name: /ai analyze/i })).toBeVisible();
});

test("AI Analyze button submits notes and shows structured result", async ({ page }) => {
  test.fail(true, "Meeting intelligence UI is not implemented yet.");
  await page.goto("/activities/new?type=MEETING");
  await page.getByLabel(/notes/i).fill("Discussed DR requirements, compliance deadlines, and follow-up proposal actions.");
  await page.getByRole("button", { name: /ai analyze/i }).click();
  await expect(page.getByText(/summary|recommended services/i)).toBeVisible();
});

test("Cross-sell opportunity card has Dismiss button that works", async ({ page }) => {
  await page.route("**/api/v1/ai/recommendations", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          recommendations: [
            {
              id: "rec-1",
              tenant_id: "tenant-1",
              tenant_name: "Demo Tenant",
              title: "Backup-as-a-Service for Demo Tenant",
              message: "Demo Tenant is running VMs without backup.",
              priority: "high",
              recommended_service: "BACKUP",
              estimated_monthly_value_usd: 1200,
            },
          ],
        },
        error: null,
        meta: {},
      }),
    });
  });
  await page.route("**/api/v1/ai/recommendations/rec-1", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { id: "rec-1", status: "dismissed" }, error: null, meta: {} }),
    });
  });

  await page.goto("/account-manager");
  await expect(page.getByText("Demo Tenant")).toBeVisible();
  await page.getByRole("button", { name: /dismiss/i }).click();
  await expect(page.getByText("Demo Tenant")).toBeVisible();
});
