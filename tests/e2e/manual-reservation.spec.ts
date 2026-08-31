import { test, expect } from "@playwright/test";
import { getLocationByOrgName, createTable, cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E ManualRes";

async function signUp(page: import("@playwright/test").Page, restaurantName: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Nom").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill("password1234");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByLabel("Nom du restaurant").fill(restaurantName);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("E2E — réservation manuelle (spec section 93)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("creating a manual reservation shows it on the dashboard and in planning", async ({ page }) => {
    const runId = Date.now();
    const restaurantName = `${NAME_PREFIX} ${runId}`;
    await signUp(page, restaurantName, `e2e-manualres-${runId}@test.local`);

    const location = await getLocationByOrgName(restaurantName);
    await createTable(location.id, "T1", 4);

    await page.goto("/reservations");
    await page.getByRole("button", { name: "Nouvelle réservation" }).click();
    const dialog = page.getByRole("dialog");
    const today = new Date().toISOString().slice(0, 10);
    await dialog.getByLabel("Date").fill(today);
    await dialog.getByLabel("Heure").fill("20:00");
    await dialog.getByLabel("Nom client").fill("Client E2E");
    await dialog.getByLabel("Téléphone").fill("0611223344");
    await dialog.getByLabel("Nombre de personnes").fill("4");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/dashboard");
    await expect(page.getByText("Client E2E")).toBeVisible();

    await page.goto("/planning");
    await expect(page.getByText("Client E2E")).toBeVisible();
    await expect(page.getByText("20:00")).toBeVisible();
  });
});
