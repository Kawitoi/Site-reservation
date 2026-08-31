import { test, expect } from "@playwright/test";
import { getLocationByOrgName, createTable, enablePublicBookingAllDay, cleanupOrganizationByName } from "./db";

const NAME_PREFIX = "E2E PublicBooking";

test.describe("E2E — réservation publique (spec section 94)", () => {
  test.afterEach(async () => {
    await cleanupOrganizationByName(NAME_PREFIX);
  });

  test("a visitor can book online without an account and it appears in the restaurant UI", async ({ page, browser }) => {
    const runId = Date.now();
    const restaurantName = `${NAME_PREFIX} ${runId}`;

    await page.goto("/signup");
    await page.getByLabel("Nom").fill("E2E Owner");
    await page.getByLabel("Email").fill(`e2e-pubbook-${runId}@test.local`);
    await page.getByLabel("Mot de passe").fill("password1234");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Nom du restaurant").fill(restaurantName);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await page.waitForURL("**/dashboard");

    const location = await getLocationByOrgName(restaurantName);
    await createTable(location.id, "T1", 4);
    await enablePublicBookingAllDay(location.id);

    // Fresh, unauthenticated context — this is a public visitor, not the owner's session.
    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();

    await visitorPage.goto(`/book/${location.publicSlug}`);
    await visitorPage.getByLabel("Nombre de personnes").fill("2");
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await visitorPage.getByLabel("Date").fill(tomorrow);
    await visitorPage.getByRole("button", { name: "Voir les disponibilités" }).click();

    const firstSlot = visitorPage.locator("button", { hasText: /^\d{2}:\d{2}$/ }).first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    await visitorPage.getByLabel("Nom").fill("Visiteur Public");
    await visitorPage.getByLabel("Téléphone").fill("0699887766");
    await visitorPage.getByRole("button", { name: "Réserver" }).click();

    await expect(visitorPage.getByText("Réservation enregistrée")).toBeVisible();
    await visitorContext.close();

    // Confirm it's visible on the restaurant's own side.
    await page.goto("/reservations");
    await expect(page.getByText("Visiteur Public")).toBeVisible();
  });
});
