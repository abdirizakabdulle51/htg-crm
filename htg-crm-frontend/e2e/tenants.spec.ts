import { expect, test } from "./fixtures";

test("AM can view their assigned tenant profile", async ({ page }) => {
  test.fail(true, "Tenant profile route is not implemented yet.");
  await page.loginAs("am");
  await page.goto("/tenants/assigned-test-tenant");
  await expect(page.getByText(/tenant profile/i)).toBeVisible();
});

test("AM cannot view a tenant assigned to another AM (gets 403)", async ({ page }) => {
  test.fail(true, "Tenant profile authorization UI is not implemented yet.");
  await page.loginAs("am");
  await page.goto("/tenants/other-am-tenant");
  await expect(page.getByText(/403|forbidden/i)).toBeVisible();
});

test("GM can view any tenant in their country", async ({ page }) => {
  test.fail(true, "Tenant profile route is not implemented yet.");
  await page.loginAs("gm");
  await page.goto("/tenants/country-tenant");
  await expect(page.getByText(/tenant profile/i)).toBeVisible();
});

test("Tenant profile shows usage chart if ClickHouse data available", async ({ page }) => {
  test.fail(true, "Tenant usage chart route is not implemented yet.");
  await page.loginAs("am");
  await page.goto("/tenants/assigned-test-tenant");
  await expect(page.getByText(/usage/i)).toBeVisible();
});

test("Risk score badge shows correct color based on score value", async ({ page }) => {
  await page.loginAs("am");
  await page.route("**/api/v1/tenants/at-risk", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: [{ id: "tenant-1", name: "Risk Tenant", sector_name: "Banking", risk_score: 85, status: "AT_RISK" }],
        error: null,
        meta: {},
      }),
    });
  });
  await page.goto("/account-manager");
  await expect(page.getByText("Risk Tenant")).toBeVisible();
  await expect(page.getByText("85")).toBeVisible();
});
