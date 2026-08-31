import { test, expect } from "@playwright/test";
import { getLocationByOrgName, createTable, countReservations, cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E DoubleBooking";

test.describe("E2E — refus du double booking (spec section 95)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("booking the same table for an overlapping slot is refused", async ({ page }) => {
    const runId = Date.now();
    const restaurantName = `${NAME_PREFIX} ${runId}`;

    await page.goto("/signup");
    await page.getByLabel("Nom").fill("E2E User");
    await page.getByLabel("Email").fill(`e2e-doublebook-${runId}@test.local`);
    await page.getByLabel("Mot de passe").fill("password1234");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Nom du restaurant").fill(restaurantName);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.waitForURL("**/dashboard");

    const location = await getLocationByOrgName(restaurantName);
    await createTable(location.id, "T1", 4);

    const today = new Date().toISOString().slice(0, 10);

    // First booking: T1, 19:00 -> 21:00.
    await page.goto("/reservations");
    await page.getByRole("button", { name: "Nouvelle réservation" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Date").fill(today);
    await dialog.getByLabel("Heure").fill("19:00");
    await dialog.getByLabel("Nom client").fill("Premier Client");
    await dialog.getByLabel("Téléphone").fill("0611112222");
    await dialog.getByLabel("Nombre de personnes").fill("2");
    await dialog.getByLabel("Table").click();
    await page.getByRole("option", { name: /T1/ }).click();
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog).toBeHidden();

    // Second booking: same table, overlapping window (20:00 -> 22:00).
    await page.getByRole("button", { name: "Nouvelle réservation" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Date").fill(today);
    await dialog.getByLabel("Heure").fill("20:00");
    await dialog.getByLabel("Nom client").fill("Second Client");
    await dialog.getByLabel("Téléphone").fill("0633334444");
    await dialog.getByLabel("Nombre de personnes").fill("2");
    await dialog.getByLabel("Table").click();
    await page.getByRole("option", { name: /T1/ }).click();
    await dialog.getByRole("button", { name: "Enregistrer" }).click();

    await expect(dialog.getByText(/vient d.être réservé/)).toBeVisible();

    const reservationCount = await countReservations(location.id);
    expect(reservationCount).toBe(1);
  });
});
