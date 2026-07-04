import { expect, test } from "./fixtures";

test("unauthenticated user is redirected to Keycloak login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/account-manager");
  await expect(page).toHaveURL(/localhost:8080|\/login/);
});

test("after login, AM is redirected to AM dashboard", async ({ page }) => {
  await page.loginAs("am");
  await expect(page).toHaveURL(/\/account-manager/);
  await expect(page.getByText("Target Health")).toBeVisible();
});

test("GM cannot access /ceo route - gets /unauthorized", async ({ page }) => {
  await page.loginAs("gm");
  await page.goto("/ceo");
  await expect(page).toHaveURL(/\/unauthorized/);
});

test("CEO can access all routes", async ({ page }) => {
  await page.loginAs("ceo");

  for (const route of ["/account-manager", "/country-manager", "/head-of-business", "/ceo"]) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/unauthorized/);
  }
});
