import { test, expect } from "@playwright/test";
import { cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E Signup";

test.describe("E2E — inscription (spec section 92)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("signup creates account + restaurant and lands on the dashboard", async ({ page }) => {
    const runId = Date.now();
    const restaurantName = `${NAME_PREFIX} ${runId}`;

    await page.goto("/signup");
    await page.getByLabel("Nom").fill("E2E User");
    await page.getByLabel("Email").fill(`e2e-signup-${runId}@test.local`);
    await page.getByLabel("Mot de passe").fill("password1234");
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.getByLabel("Nom du restaurant").fill(restaurantName);
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.getByLabel("Téléphone").fill("0102030405");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(restaurantName, { exact: true })).toBeVisible();
  });
});
