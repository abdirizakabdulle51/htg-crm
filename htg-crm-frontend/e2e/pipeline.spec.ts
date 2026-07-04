import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.loginAs("am");
});

test("AM can create a new lead with all required fields", async ({ page }) => {
  test.fail(true, "Lead creation UI route is not implemented yet.");
  await page.goto("/leads/new");
  await page.getByLabel(/company/i).fill(`Playwright Lead ${Date.now()}`);
  await page.getByLabel(/country/i).click();
  await page.getByLabel(/sector/i).click();
  await page.getByRole("button", { name: /save lead/i }).click();
  await expect(page.getByText(/lead created/i)).toBeVisible();
});

test("AM can advance lead from stage 1 to stage 2", async ({ page }) => {
  test.fail(true, "Lead detail stage controls are not implemented yet.");
  await page.goto("/leads");
  await page.getByRole("button", { name: /advance/i }).first().click();
  await expect(page.getByText(/stage 2|qualified/i)).toBeVisible();
});

test("AM cannot skip stages - advance from 1 to 3 shows error", async ({ page }) => {
  test.fail(true, "Lead stage validation UI is not implemented yet.");
  await page.goto("/leads");
  await page.getByLabel(/stage/i).fill("3");
  await page.getByRole("button", { name: /advance/i }).click();
  await expect(page.getByText(/cannot skip|invalid stage/i)).toBeVisible();
});

test("Moving lead to stage 10 (Lost) requires reason field", async ({ page }) => {
  test.fail(true, "Lead lost workflow UI is not implemented yet.");
  await page.goto("/leads");
  await page.getByLabel(/stage/i).fill("10");
  await page.getByRole("button", { name: /advance/i }).click();
  await expect(page.getByText(/reason.*required/i)).toBeVisible();
});

test("Moving lead to stage 9 (Won) creates a tenant record", async ({ page }) => {
  test.fail(true, "Won lead conversion UI is not implemented yet.");
  await page.goto("/leads");
  await page.getByLabel(/stage/i).fill("9");
  await page.getByRole("button", { name: /advance/i }).click();
  await expect(page.getByText(/tenant created/i)).toBeVisible();
});

test("Won lead: tenant appears in /tenants list after Won", async ({ page }) => {
  test.fail(true, "Tenants list route is not implemented yet.");
  await page.goto("/tenants");
  await expect(page.getByText(/playwright lead/i)).toBeVisible();
});
