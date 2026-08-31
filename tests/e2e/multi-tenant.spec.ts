import { test, expect } from "@playwright/test";
import { getLocationByOrgName, createTable, getFirstCustomerByOrg, cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E MultiTenant";

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

test.describe("E2E — isolation multi-tenant (spec section 96)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("restaurant B cannot see or reach restaurant A's data through the UI", async ({ browser }) => {
    const runId = Date.now();
    const nameA = `${NAME_PREFIX} A ${runId}`;
    const nameB = `${NAME_PREFIX} B ${runId}`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signUp(pageA, nameA, `e2e-tenant-a-${runId}@test.local`);

    const locationA = await getLocationByOrgName(nameA);
    await createTable(locationA.id, "T1", 4);
    await pageA.goto("/reservations");
    await pageA.getByRole("button", { name: "Nouvelle réservation" }).click();
    const dialogA = pageA.getByRole("dialog");
    const today = new Date().toISOString().slice(0, 10);
    await dialogA.getByLabel("Date").fill(today);
    await dialogA.getByLabel("Heure").fill("19:00");
    await dialogA.getByLabel("Nom client").fill("Client Confidentiel A");
    await dialogA.getByLabel("Téléphone").fill("0611110000");
    await dialogA.getByLabel("Nombre de personnes").fill("2");
    await dialogA.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialogA).toBeHidden();

    const customerA = await getFirstCustomerByOrg(locationA.organizationId);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signUp(pageB, nameB, `e2e-tenant-b-${runId}@test.local`);

    // B's own reservations list must never show A's data.
    await pageB.goto("/reservations");
    await expect(pageB.getByText("Client Confidentiel A")).not.toBeVisible();

    // Guessing A's customer detail URL from B's session must not work.
    const response = await pageB.goto(`/clients/${customerA.id}`);
    expect(response?.status()).toBe(404);

    await contextA.close();
    await contextB.close();
  });
});
