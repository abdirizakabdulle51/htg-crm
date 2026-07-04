import fs from "node:fs/promises";
import path from "node:path";

import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

export type Role = "am" | "gm" | "hob" | "ceo";

type HtgPage = Page & {
  loginAs(role: Role): Promise<void>;
};

type HtgFixtures = {
  page: HtgPage;
};

const credentials: Record<Role, { email: string; password: string; dashboard: string }> = {
  am: { email: "am@test.com", password: "htgdev", dashboard: "/account-manager" },
  gm: { email: "gm@test.com", password: "htgdev", dashboard: "/country-manager" },
  hob: { email: "hob@test.com", password: "htgdev", dashboard: "/head-of-business" },
  ceo: { email: "ceo@test.com", password: "htgdev", dashboard: "/ceo" },
};

const authDir = path.join(__dirname, ".auth");

export const test = base.extend<HtgFixtures>({
  page: async ({ page }, use) => {
    const htgPage = page as HtgPage;

    htgPage.loginAs = async (role: Role) => {
      const authPath = path.join(authDir, `${role}.json`);
      await page.context().clearCookies();

      if (await storageExists(authPath)) {
        await applyStorageState(page.context(), authPath);
        await page.goto(credentials[role].dashboard);
        return;
      }

      await fs.mkdir(authDir, { recursive: true });
      await page.goto("/login");
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/localhost:8080|\/login/);

      if (page.url().includes("/login")) {
        await page.getByRole("button", { name: /continue/i }).click();
      }

      await page.getByLabel(/username|email/i).fill(credentials[role].email);
      await page.getByLabel(/password/i).fill(credentials[role].password);
      await page.getByRole("button", { name: /^sign in$/i }).click();
      await page.waitForURL(new RegExp(`${credentials[role].dashboard.replace("/", "\\/")}|\\/unauthorized`), {
        timeout: 30000,
      });

      await page.context().storageState({ path: authPath });
    };

    await use(htgPage);
  },
});

export { expect };

async function storageExists(authPath: string) {
  try {
    await fs.access(authPath);
    return true;
  } catch {
    return false;
  }
}

async function applyStorageState(context: BrowserContext, authPath: string) {
  const raw = await fs.readFile(authPath, "utf8");
  const state = JSON.parse(raw) as {
    cookies?: Parameters<BrowserContext["addCookies"]>[0];
    origins?: Array<{ origin: string; localStorage?: Array<{ name: string; value: string }> }>;
  };

  if (state.cookies?.length) {
    await context.addCookies(state.cookies);
  }
}
